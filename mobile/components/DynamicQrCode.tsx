import { useCallback, useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text, XStack, YStack } from 'tamagui';
import * as Haptics from 'expo-haptics';
import api from '../api';
import type { QrTokenResponse } from '../types/api';
import CryptoJS from 'crypto-js';

const TOKEN_TTL_SECONDS = 15; // must match authController.js getQrToken expiresIn
const REFRESH_MARGIN_SECONDS = 3; // refresh before expiry so the QR never visibly hits 0

interface DynamicQrCodeProps {
  /** user.student_id — shown whenever /auth/qr-token can't be reached, so the QR stays scannable. */
  fallbackId: string;
  offlineSecret?: string;
  size?: number;
}

export function DynamicQrCode({ fallbackId, offlineSecret, size = 200 }: DynamicQrCodeProps) {
  const [value, setValue] = useState(fallbackId);
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_TTL_SECONDS);
  // false once /auth/qr-token has failed at least once — the QR is still scannable
  // (the server accepts the raw student_id too) but the code is no longer rotating,
  // so the student should know to alert a librarian if it doesn't scan.
  const [isLive, setIsLive] = useState(true);
  const tickTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<QrTokenResponse>('/auth/qr-token');
      setValue(data.token);
      setIsLive(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      if (offlineSecret) {
        const ts = Date.now().toString();
        const hmac = CryptoJS.HmacSHA256(ts, offlineSecret).toString(CryptoJS.enc.Hex);
        setValue(`OFFLINE:${fallbackId}:${ts}:${hmac}`);
      } else {
        setValue(fallbackId); // fallback if no offline secret
      }
      setIsLive(false);
    } finally {
      setSecondsLeft(TOKEN_TTL_SECONDS);
    }
  }, [fallbackId]);

  useEffect(() => {
    refresh();
    tickTimer.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => clearInterval(tickTimer.current);
  }, [refresh]);

  useEffect(() => {
    if (secondsLeft === REFRESH_MARGIN_SECONDS) {
      refresh();
    }
  }, [secondsLeft, refresh]);

  return (
    <YStack alignItems="center" gap="$2">
      <QRCode value={value} size={size} color="#1e1e2e" backgroundColor="transparent" />
      {isLive ? (
        <Text fontSize={12} color="#9ca3af" fontWeight="500">
          Refreshes in {secondsLeft}s
        </Text>
      ) : (
        <XStack alignItems="center" gap="$1.5">
          <WifiOff color="#dc2626" size={13} />
          <Text fontSize={12} color="#dc2626" fontWeight="600">
            Connection lost — code isn't refreshing
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
