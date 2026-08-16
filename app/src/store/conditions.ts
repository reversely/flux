import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { Barometer, Magnetometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

/**
 * Everything the phone can measure about right now, read for what it implies
 * rather than what it is (PRD 1.7). Each reading is optional: a sensor that
 * is missing or refused leaves its field undefined and the surface says so,
 * rather than showing a zero.
 */

export interface Conditions {
  /** Hectopascals, and the change over the sampling window. */
  pressure?: number;
  pressureTrend?: 'falling' | 'rising' | 'steady';
  /** Metres, from the barometer on iOS. */
  relativeAltitude?: number;
  heading?: number;
  position?: { lat: number; lon: number; altitude?: number; accuracy?: number };
  daylight?: { sunrise: Date; sunset: Date; remainingMinutes: number };
  battery?: { level: number; charging: boolean; lowPower: boolean };
  online?: boolean;
}

/** Compass point for a heading, which is what a user acts on. */
export function cardinal(degrees: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(degrees / 45) % 8];
}

/**
 * Sunrise and sunset from the NOAA solar position algorithm, computed on the
 * phone so daylight works with no network and no extra dependency.
 * Returns undefined above the polar circles when the sun neither rises nor sets.
 */
export function sunTimes(lat: number, lon: number, when: Date): { sunrise: Date; sunset: Date } | undefined {
  const rad = Math.PI / 180;
  const localMidnightUtc = Date.UTC(when.getFullYear(), when.getMonth(), when.getDate());
  const yearStart = Date.UTC(when.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((localMidnightUtc - yearStart) / 86400000);
  // Fractional year, then the equation of time and declination.
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 - 0.5);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  // 90.833 degrees accounts for refraction and the sun's disc.
  const cosHa =
    Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) -
    Math.tan(lat * rad) * Math.tan(decl);
  if (cosHa > 1 || cosHa < -1) {
    return undefined;
  }
  const ha = Math.acos(cosHa) / rad;
  const noonMinutes = 720 - 4 * lon - eqTime;
  const midnight = localMidnightUtc;
  return {
    sunrise: new Date(midnight + (noonMinutes - 4 * ha) * 60000),
    sunset: new Date(midnight + (noonMinutes + 4 * ha) * 60000),
  };
}

const PRESSURE_WINDOW = 12;
/** hPa over the window that counts as a real trend rather than noise. */
const TREND_THRESHOLD = 0.4;

/** Samples every sensor the device offers and reports what it can. */
export function useConditions(): Conditions {
  const [conditions, setConditions] = useState<Conditions>({});

  useEffect(() => {
    let cancelled = false;
    const samples: number[] = [];
    const subscriptions: { remove: () => void }[] = [];

    void (async () => {
      if (await Barometer.isAvailableAsync()) {
        subscriptions.push(
          Barometer.addListener(({ pressure, relativeAltitude }) => {
            samples.push(pressure);
            if (samples.length > PRESSURE_WINDOW) {
              samples.shift();
            }
            const change = samples.length > 3 ? samples[samples.length - 1] - samples[0] : 0;
            setConditions((c) => ({
              ...c,
              pressure,
              relativeAltitude,
              pressureTrend:
                change < -TREND_THRESHOLD ? 'falling' : change > TREND_THRESHOLD ? 'rising' : 'steady',
            }));
          }),
        );
        Barometer.setUpdateInterval(2000);
      }

      if (await Magnetometer.isAvailableAsync()) {
        subscriptions.push(
          Magnetometer.addListener(({ x, y }) => {
            const degrees = (Math.atan2(y, x) * 180) / Math.PI;
            setConditions((c) => ({ ...c, heading: (degrees + 360) % 360 }));
          }),
        );
        Magnetometer.setUpdateInterval(500);
      }

      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.granted) {
        const fix = await Location.getLastKnownPositionAsync();
        if (fix !== null && !cancelled) {
          const { latitude, longitude, altitude, accuracy } = fix.coords;
          const times = sunTimes(latitude, longitude, new Date());
          setConditions((c) => ({
            ...c,
            position: {
              lat: latitude,
              lon: longitude,
              altitude: altitude ?? undefined,
              accuracy: accuracy ?? undefined,
            },
            daylight:
              times === undefined
                ? undefined
                : {
                    ...times,
                    remainingMinutes: Math.round((times.sunset.getTime() - Date.now()) / 60000),
                  },
          }));
        }
      }

      const [level, state, lowPower, network] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
        Battery.isLowPowerModeEnabledAsync(),
        Network.getNetworkStateAsync(),
      ]);
      if (!cancelled) {
        setConditions((c) => ({
          ...c,
          battery: { level, charging: state === Battery.BatteryState.CHARGING, lowPower },
          online: network.isInternetReachable ?? false,
        }));
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.forEach((s) => s.remove());
    };
  }, []);

  return conditions;
}
