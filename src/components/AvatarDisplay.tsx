import React, { useEffect, useMemo, useState } from 'react';
import { getEmojiCdnUrls } from './HoloStage3D';

interface AvatarDisplayProps {
  avatar: string;
  alt?: string;
  className?: string;
  emojiClassName?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatar,
  alt = 'Avatar',
  className = 'h-12 w-12 rounded-2xl',
  emojiClassName = 'text-2xl',
}) => {
  const isUploadedOrHttp = avatar.startsWith('data:image') || avatar.startsWith('http');
  const [urlIdx, setUrlIdx] = useState(0);

  const emojiUrls = useMemo(
    () => (isUploadedOrHttp ? [] : getEmojiCdnUrls(avatar)),
    [avatar, isUploadedOrHttp]
  );

  useEffect(() => {
    setUrlIdx(0);
  }, [avatar]);

  if (isUploadedOrHttp) {
    return <img src={avatar} alt={alt} className={`object-cover ${className}`} />;
  }

  const activeUrl = emojiUrls[urlIdx];
  if (activeUrl) {
    return (
      <img
        src={activeUrl}
        alt={alt}
        onError={() => setUrlIdx((i) => i + 1)}
        className={`object-contain p-0.5 drop-shadow-sm ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <span className={`inline-flex items-center justify-center ${emojiClassName}`}>
      {avatar}
    </span>
  );
};
