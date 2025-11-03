'use client';

import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useFollow } from '@/lib/hooks/useFollow';
import { useTranslations } from 'next-intl';

interface FollowButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function FollowButton({
  userId,
  variant = 'default',
  size = 'md',
  showLabel = true,
}: FollowButtonProps) {
  const t = useTranslations('profile');
  const { isFollowing, following, follow, unfollow } = useFollow(userId);

  const handleClick = async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  };

  const labels = {
    follow: t('follow', { default: 'Follow' }),
    following: t('following', { default: 'Following' }),
    unfollow: t('unfollow', { default: 'Unfollow' }),
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={following}
      className="gap-2"
    >
      {following ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {showLabel && (isFollowing ? labels.following : labels.follow)}
    </Button>
  );
}
