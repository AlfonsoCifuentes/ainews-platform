'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/shared/ToastProvider';
import { 
  compressImage, 
  validateImageFile, 
  getImagePreviewUrl, 
  revokeImagePreviewUrl 
} from '@/lib/utils/image-compression';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadSuccess?: (newAvatarUrl: string) => void;
  userName?: string;
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  onUploadSuccess,
  userName = 'User'
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid file', 'error');
      return;
    }

    try {
      setUploading(true);

      // Compress image client-side
      const compressedFile = await compressImage(file, {
        maxWidth: 200,
        maxHeight: 200,
        maxSizeKB: 100,
        quality: 0.8,
        format: 'image/jpeg'
      });

      // Show preview
      const preview = getImagePreviewUrl(compressedFile);
      setPreviewUrl(preview);

      // Upload to server
      const formData = new FormData();
      formData.append('avatar', compressedFile);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { avatar_url, size_kb } = await response.json();

      showToast(`Avatar updated (${size_kb}KB)`, 'success');

      // Clean up preview
      revokeImagePreviewUrl(preview);
      setPreviewUrl(null);

      // Notify parent
      onUploadSuccess?.(avatar_url);

    } catch (error) {
      console.error('[Avatar Upload]', error);
      showToast(
        error instanceof Error ? error.message : 'Upload failed',
        'error'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    try {
      setDeleting(true);

      const response = await fetch('/api/user/avatar', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      showToast('Avatar removed', 'success');

      onUploadSuccess?.(null as unknown as string);

    } catch (error) {
      console.error('[Avatar Delete]', error);
      showToast(
        error instanceof Error ? error.message : 'Delete failed',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl || undefined;
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-primary/20">
          <AvatarImage src={displayUrl} alt={userName} />
          <AvatarFallback className="text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Loading Overlay */}
        {(uploading || deleting) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Delete Button */}
        {currentAvatarUrl && !uploading && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -right-2 -top-2 h-8 w-8 rounded-full"
            onClick={handleDelete}
            disabled={deleting}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || deleting}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {currentAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        JPG format, max 5MB (auto-compressed to ≤100KB)
      </p>
    </div>
  );
}
