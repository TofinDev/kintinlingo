import React from 'react';

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
  const isImage = avatar.startsWith('data:image') || avatar.startsWith('http');

  if (isImage) {
    return (
      <img
        src={avatar}
        alt={alt}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center justify-center ${emojiClassName}`}>
      {avatar}
    </span>
  );
};
