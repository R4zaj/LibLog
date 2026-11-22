import { ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text, YStack } from 'tamagui';

interface DynamicQrCodeProps {
  /** Persistent hashed user.qr_code token for secure offline-ready scanning. */
  qrCode?: string | null;
  /** Kept for prop compatibility; plain IDs are never encoded into the QR image. */
  fallbackId?: string;
  size?: number;
}

/**
 * Renders the user's persistent hashed library QR code (`QR-...`).
 * Never falls back to encoding a raw student_id so plain IDs cannot be forged.
 */
export function DynamicQrCode({ qrCode, size = 200 }: DynamicQrCodeProps) {
  return (
    <YStack alignItems="center" gap="$2">
      <YStack
        backgroundColor="#ffffff"
        padding={14}
        borderRadius={14}
        alignItems="center"
        justifyContent="center"
        width={size + 28}
        height={size + 28}
      >
        {qrCode ? (
          <QRCode value={qrCode} size={size} color="#1e1e2e" backgroundColor="#ffffff" />
        ) : (
          <YStack alignItems="center" gap="$2">
            <ActivityIndicator size="small" color="#6C48C5" />
            <Text fontSize={12} color="#6b7280" textAlign="center">
              Syncing secure QR pass...
            </Text>
          </YStack>
        )}
      </YStack>
      <Text fontSize={12} color="#9ca3af" fontWeight="500">
        Scan at library desk for attendance & borrowing
      </Text>
    </YStack>
  );
}
