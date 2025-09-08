import { useState, useEffect, useRef } from "react";

interface GeoLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
}

interface ScreenResolution {
  width: number;
  height: number;
}

interface PushNotifications {
  enabled: boolean;
  lastNotificationReceived: string | null;
}

interface SessionMetadata {
  geoLocation: GeoLocation | null;
  platform: "web";
  webMetadata: {
    os: string | null;
    userAgent: string;
    ipAddress: string | null;
    appVersion: string;
    screenResolution: ScreenResolution;
    pushNotifications: PushNotifications;
  };
  sessionDuration: number;
}

const useSessionTracker = (): SessionMetadata | null => {
  const [sessionMetadata, setSessionMetadata] =
    useState<SessionMetadata | null>(null);
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    collectSessionData();
  }, []);

  async function collectSessionData() {
    const [geoLocation, ipAddress] = await Promise.all([
      getGeoLocation(),
      getIpAddress(),
    ]);

    function getBrowserName(userAgent: string): string {
      if (/Edg/i.test(userAgent)) return "Edge";
      if (/OPR/i.test(userAgent)) return "Opera";
      if (/Chrome/i.test(userAgent)) return "Chrome";
      if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent))
        return "Safari";
      if (/Firefox/i.test(userAgent)) return "Firefox";
      if (/MSIE|Trident/i.test(userAgent)) return "Internet Explorer";
      return "Unknown";
    }

    const userAgent = navigator.userAgent;
    const browserName = getBrowserName(userAgent);

    const osMatch = userAgent.match(/\((.*?)\)/);
    const os = osMatch ? osMatch[1] : null;

    const session: SessionMetadata = {
      geoLocation,
      platform: "web",
      webMetadata: {
        os,
        userAgent: browserName,
        ipAddress,
        appVersion: "2.1.0",
        screenResolution: {
          width: window.screen.width,
          height: window.screen.height,
        },
        pushNotifications: {
          enabled: Notification.permission === "granted",
          lastNotificationReceived:
            Notification.permission === "granted"
              ? new Date().toISOString()
              : null,
        },
      },
      sessionDuration: Math.floor(
        (Date.now() - sessionStartTime.current) / 1000
      ),
    };

    setSessionMetadata(session);
  }

  async function getGeoLocation(): Promise<GeoLocation | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = await getCityCountry(latitude, longitude);
          resolve({
            latitude,
            longitude,
            city: location?.city || "city",
            country: location?.country || "country",
          });
        },
        () => resolve(null)
      );
    });
  }

  async function getCityCountry(
    lat: number,
    lng: number
  ): Promise<{ city: string | null; country: string | null } | null> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return {
        city:
          data.address.city ||
          data.address.town ||
          data.address.village ||
          "city",
        country: data.address.country || "country",
      };
    } catch {
      return null;
    }
  }

  async function getIpAddress(): Promise<string | null> {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || "ip";
    } catch {
      return "";
    }
  }

  return sessionMetadata;
};

export default useSessionTracker;
