import QRCode from 'react-native-qrcode-svg';
import { Text, YStack } from 'tamagui';

interface DynamicQrCodeProps {
  /** Persistent opaque user.qr_code token for instant offline-ready scanning. */
  qrCode?: string | null;
  /** user.student_id — fallback if user.qr_code is not yet populated. */
  fallbackId: string;
  size?: number;
}

/**
 * Renders the user's persistent library QR code immediately with no network
 * round-trips or expiration timers, eliminating mid-scan flicker and timeouts.
 */
export function DynamicQrCode({ qrCode, fallbackId, size = 200 }: DynamicQrCodeProps) {
  const value = qrCode || fallbackId;

  return (
    <YStack alignItems="center" gap="$2">
      <YStack
        backgroundColor="#ffffff"
        padding={14}
        borderRadius={14}
        alignItems="center"
        justifyContent="center"
      >
        <QRCode value={value} size={size} color="#1e1e2e" backgroundColor="#ffffff" />
      </YStack>
      <Text fontSize={12} color="#9ca3af" fontWeight="500">
        Scan at library desk for attendance & borrowing
      </Text>
    </YStack>
  );
}
