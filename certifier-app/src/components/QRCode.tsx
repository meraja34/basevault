import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  url: string;
  size?: number;
}

export default function QRCode({ url, size = 160 }: QRCodeProps) {
  return (
    <div className="qr-container">
      <QRCodeSVG
        value={url}
        size={size}
        bgColor="#12122a"
        fgColor="#e0e0f0"
        level="M"
      />
      <p className="qr-label">Scan to verify</p>
    </div>
  );
}
