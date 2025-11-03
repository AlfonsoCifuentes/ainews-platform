# 🎯 User Profile & Gamification System - Implementation Guide

## ✅ Completed (Session)

### Backend Infrastructure (100%)
- ✅ **Database Migration** (`supabase/migrations/20250103_user_system.sql`)
  - Tables: `user_profiles`, `user_courses`, `user_progress`, `user_xp_log`, `user_achievements`
  - Functions: `award_xp()`, `handle_new_user()`, `update_course_progress()`
  - Triggers: Auto-create profile, auto-update progress percentage
  - RLS policies: All tables secured

- ✅ **Avatar Upload System**
  - Client-side compression: `lib/utils/image-compression.ts`
  - Server-side Sharp compression: JPG ≤100KB, 200x200px
  - API: `POST/DELETE /api/user/avatar`
  - Supabase Storage bucket: `avatars` (needs manual creation)

- ✅ **User Profile API** (`app/api/user/profile/route.ts`)
  - GET: Fetch user profile
  - PATCH: Update profile (username, bio, locale, theme)
  - Username uniqueness validation

- ✅ **Course Management API** (`app/api/user/courses/route.ts`)
  - GET: List enrolled/created courses with progress
  - POST: Enroll in course (awards 10 XP)

- ✅ **Progress Tracking API** (`app/api/user/progress/route.ts`)
  - GET: Module-level progress for a course
  - POST: Update module completion (awards 50 XP)
  - Auto achievement unlock on course completion

- ✅ **Gamification System**
  - XP System: `lib/gamification/xp-system.ts`
    - 15+ action types (course create: 100XP, module complete: 50XP, article read: 5XP)
    - Exponential leveling: `level = floor(sqrt(xp_total / 100)) + 1`
    - Level tiers: Bronze (1-9), Silver (10-19), Gold (20-29), Platinum (30+)
  
  - Achievements: `lib/gamification/achievements.ts`
    - 18 badges across 4 tiers
    - Auto-unlock based on UserStats
    - XP rewards per achievement

- ✅ **UI Components**
  - `components/ui/button.tsx` - Button component
  - `components/ui/avatar.tsx` - Avatar with Radix UI
  - `components/dashboard/AvatarUpload.tsx` - Avatar upload with preview
  - `lib/utils/index.ts` - Tailwind merge utility

---

## 🚧 Pending Implementation

### 1. Supabase Setup (CRITICAL - DO FIRST)

#### A. Run Migration
```sql
-- Execute in Supabase Dashboard → SQL Editor
-- Copy/paste content from: supabase/migrations/20250103_user_system.sql
```

#### B. Create Storage Bucket
```
Supabase Dashboard → Storage → Create Bucket

Name: avatars
Public: ✅ Yes
File size limit: 100KB
Allowed MIME types: image/jpeg
```

#### C. Storage Policies (Supabase Dashboard → Storage → avatars → Policies)
```sql
-- Policy 1: Users can upload own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Anyone can view avatars  
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 3: Users can update own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 2. UI Components (Priority Order)

#### A. XP/Level Display Component
**File**: `components/dashboard/XPDisplay.tsx`

```tsx
'use client';

import { Progress } from '@/components/ui/progress';
import { 
  calculateLevel, 
  levelProgress, 
  xpToNextLevel, 
  getLevelTier,
  formatXP 
} from '@/lib/gamification/xp-system';

interface XPDisplayProps {
  totalXP: number;
  className?: string;
}

export function XPDisplay({ totalXP, className }: XPDisplayProps) {
  const level = calculateLevel(totalXP);
  const progress = levelProgress(totalXP);
  const xpNeeded = xpToNextLevel(totalXP);
  const { tier, color } = getLevelTier(level);

  return (
    <div className={className}>
      {/* Level Badge */}
      <div className="flex items-center gap-3">
        <div 
          className="flex h-16 w-16 items-center justify-center rounded-full border-4"
          style={{ borderColor: color }}
        >
          <span className="text-2xl font-bold">{level}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Level {level}</span>
            <span className="text-xs text-muted-foreground capitalize">{tier}</span>
          </div>
          <Progress value={progress} className="mt-1" />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatXP(xpNeeded)} XP to next level
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Needs**: `components/ui/progress.tsx` (shadcn component)

#### B. Profile Editor Component
**File**: `components/dashboard/ProfileEditor.tsx`

```tsx
'use client';

import { useState } from 'react';
import { AvatarUpload } from './AvatarUpload';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/shared/ToastProvider';

interface ProfileEditorProps {
  profile: {
    username: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    locale: string;
    theme: string;
  };
  onUpdate?: (updatedProfile: any) => void;
}

export function ProfileEditor({ profile, onUpdate }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      const { data } = await response.json();
      
      showToast('Profile updated successfully', 'success');
      setEditing(false);
      onUpdate?.(data);
      
    } catch (error) {
      console.error('[Profile Update]', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to update profile',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <AvatarUpload
        currentAvatarUrl={formData.avatar_url}
        userName={formData.full_name || formData.username}
        onUploadSuccess={(url) => setFormData({ ...formData, avatar_url: url })}
      />

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={!editing}
          />
        </div>

        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData.full_name || ''}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            disabled={!editing}
          />
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio || ''}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            disabled={!editing}
            maxLength={500}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Edit Profile</Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setFormData(profile);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Needs**: 
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/label.tsx`

#### C. Badge Grid Component
**File**: `components/dashboard/BadgeGrid.tsx`

```tsx
'use client';

import { ACHIEVEMENTS, getAchievementColor } from '@/lib/gamification/achievements';

interface BadgeGridProps {
  unlockedAchievements: string[];
  locale: 'en' | 'es';
}

export function BadgeGrid({ unlockedAchievements, locale }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {ACHIEVEMENTS.map((achievement) => {
        const isUnlocked = unlockedAchievements.includes(achievement.id);
        const color = getAchievementColor(achievement.tier);

        return (
          <div
            key={achievement.id}
            className={`
              flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all
              ${isUnlocked 
                ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' 
                : 'bg-muted/50 border-muted grayscale opacity-50'
              }
            `}
            style={isUnlocked ? { borderColor: color } : undefined}
          >
            <span className="text-4xl">{achievement.icon}</span>
            <p className="text-xs font-semibold text-center">
              {locale === 'en' ? achievement.name_en : achievement.name_es}
            </p>
            {isUnlocked && (
              <span className="text-xs text-muted-foreground">
                +{achievement.xp_reward} XP
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### D. User Dashboard Page
**File**: `app/[locale]/dashboard/page.tsx`

```tsx
import { createClient } from '@/lib/db/supabase-server';
import { redirect } from 'next/navigation';
import { ProfileEditor } from '@/components/dashboard/ProfileEditor';
import { XPDisplay } from '@/components/dashboard/XPDisplay';
import { BadgeGrid } from '@/components/dashboard/BadgeGrid';

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/');
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch achievements
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', user.id);

  const unlockedAchievements = achievements?.map(a => a.achievement_id) || [];

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">My Dashboard</h1>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Profile</h2>
          <ProfileEditor profile={profile} />
        </div>

        {/* Stats Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Progress</h2>
          <XPDisplay totalXP={profile.xp_total} />
        </div>
      </div>

      {/* Achievements */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Achievements</h2>
        <BadgeGrid 
          unlockedAchievements={unlockedAchievements} 
          locale={params.locale as 'en' | 'es'} 
        />
      </div>
    </div>
  );
}
```

### 3. Integrate AuthProvider in Layout

**File**: `app/[locale]/layout.tsx`

```tsx
import { AuthProvider } from '@/lib/auth/auth-context';

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  return (
    <AuthProvider>
      {/* existing layout content */}
      {children}
    </AuthProvider>
  );
}
```

### 4. Missing shadcn Components

Install these shadcn components:

```bash
# Progress bar
npx shadcn@latest add progress

# Input
npx shadcn@latest add input

# Textarea
npx shadcn@latest add textarea

# Label
npx shadcn@latest add label
```

Or create manually from shadcn docs.

---

## 📊 Database Schema Summary

### Tables Created (5)
1. **user_profiles** - Avatar, bio, XP, level, preferences
2. **user_courses** - Enrolled/created courses with progress %
3. **user_progress** - Per-module completion, scores, notes
4. **user_xp_log** - XP history for all actions
5. **user_achievements** - Unlocked badges

### Functions (3)
- `award_xp(user_id, amount, action_type, reference_id)` - Awards XP and updates level
- `handle_new_user()` - Trigger on auth.users INSERT
- `update_course_progress()` - Trigger on user_progress UPDATE

### Storage
- **Bucket**: `avatars`
- **Format**: JPG only
- **Size**: ≤100KB
- **Dimensions**: 200x200px

---

## 🎮 Gamification Features

### XP Actions (15+)
| Action | XP | When |
|--------|----|----|
| course_create | 100 | Create a course |
| course_enroll | 10 | Enroll in course |
| module_complete | 50 | Complete module |
| course_complete | 200 | Finish course |
| perfect_score | 100 | 100% quiz score |
| article_read | 5 | Read article |
| article_bookmark | 2 | Bookmark article |
| article_share | 3 | Share article |
| daily_login | 10 | Daily login |
| week_streak | 50 | 7-day streak |
| profile_complete | 20 | Complete profile |

### Level Tiers
- **Bronze** (1-9): hsl(30 80% 50%)
- **Silver** (10-19): hsl(0 0% 70%)
- **Gold** (20-29): hsl(45 100% 60%)
- **Platinum** (30+): hsl(210 100% 70%)

### Achievements (18)
- First Course, Educator, Master Educator
- First Completion, Knowledge Seeker, Course Master
- Speed Reader, News Junkie
- Perfectionist, Ace Student
- Dedicated Learner, Unstoppable, Legend
- Level 10/25/50 milestones
- Early Adopter, Helpful

---

## 🔄 Integration Checklist

- [ ] Run migration in Supabase
- [ ] Create avatars bucket with policies
- [ ] Wrap app with AuthProvider
- [ ] Create shadcn components (progress, input, textarea, label)
- [ ] Create XPDisplay component
- [ ] Create ProfileEditor component
- [ ] Create BadgeGrid component
- [ ] Create dashboard page
- [ ] Test avatar upload
- [ ] Test profile update
- [ ] Test course enrollment
- [ ] Test module completion → XP award
- [ ] Test achievement unlock
- [ ] Add XP awards to course creation
- [ ] Add XP awards to article reading
- [ ] Add XP awards to bookmarks/shares
- [ ] Implement streak system (daily activity tracking)
- [ ] Add achievement unlock notifications

---

## 🚀 Next Features

### Immediate (Session Complete)
1. **Progress Tracker** - Visual course completion
2. **Leaderboard** - Top users by XP
3. **My Courses** - Enrolled/Created tabs

### Phase 2 (Future)
1. **Streak System** - Daily activity tracking
2. **Achievement Notifications** - Toast on unlock
3. **Badges Page** - Gallery view
4. **User Stats** - Charts and analytics
5. **Profile Sharing** - Public profiles

---

## 💾 Commit Messages

**Current Session**:
```
feat: user profile system with gamification backend

- Database migration: 5 tables, 3 functions, 2 triggers
- Avatar upload API with Sharp compression (≤100KB)
- Profile/courses/progress APIs
- XP system (15+ actions, exponential leveling)
- 18 achievements across 4 tiers
- UI components: AvatarUpload, button, avatar
```

**Next Commit** (after UI completion):
```
feat: complete user dashboard with gamification UI

- ProfileEditor with live updates
- XPDisplay with level tiers
- BadgeGrid with 18 achievements
- Dashboard page with stats
- AuthProvider integration
```

---

## 📖 Usage Examples

### Award XP Programmatically
```typescript
// In any API route
await supabase.rpc('award_xp', {
  p_user_id: user.id,
  p_xp_amount: 50,
  p_action_type: 'module_complete',
  p_reference_id: module.id
});
```

### Check User Stats
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('xp_total, level')
  .eq('id', user.id)
  .single();

const currentLevel = calculateLevel(profile.xp_total);
```

### Unlock Achievement
```typescript
await supabase
  .from('user_achievements')
  .upsert({
    user_id: user.id,
    achievement_id: 'first_course'
  }, {
    onConflict: 'user_id,achievement_id',
    ignoreDuplicates: true
  });
```

---

## ✅ Session Summary

**Completed**:
- ✅ Complete database schema
- ✅ All API endpoints
- ✅ Avatar system with compression
- ✅ XP/leveling logic
- ✅ Achievement definitions
- ✅ Basic UI components

**Ready for**:
- User dashboard implementation
- Gamification integration across platform
- Real-time XP updates
- Achievement unlock system

**Next Session**: Complete UI components, test full flow, integrate XP awards into existing features (courses, articles, bookmarks).
