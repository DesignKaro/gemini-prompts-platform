import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ProfileSettingsModal,
  type ProfileFormState,
} from '../../features/dashboard/profile/components/ProfileSettingsModal';

function buildProfileFormState(overrides?: Partial<ProfileFormState>): ProfileFormState {
  return {
    name: 'Alice',
    handle: 'alice',
    profileTitle: 'Creator',
    bio: '',
    focusTags: [],
    avatarUrl: '',
    avatarUpdatedAt: null,
    hasPassword: true,
    ...overrides,
  };
}

function renderModal(profileForm: ProfileFormState) {
  return render(
    <ProfileSettingsModal
      isOpen
      displayName="Alice"
      isProfileSaving={false}
      profileLoadError={null}
      profileSaveError={null}
      avatarPreview={null}
      profileForm={profileForm}
      focusTagsInput=""
      onRetryLoad={() => undefined}
      onClose={() => undefined}
      onSubmit={(event) => event.preventDefault()}
      onAvatarChange={() => undefined}
      onRemoveAvatar={() => undefined}
      onNameChange={() => undefined}
      onProfileTitleChange={() => undefined}
      onHandleChange={() => undefined}
      onFocusTagsInputChange={() => undefined}
      onBioChange={() => undefined}
      previousPassword=""
      newPassword=""
      confirmPassword=""
      onPreviousPasswordChange={() => undefined}
      onNewPasswordChange={() => undefined}
      onConfirmPasswordChange={() => undefined}
    />,
  );
}

describe('ProfileSettingsModal', () => {
  it('shows previous+new password fields when hasPassword=true', () => {
    renderModal(buildProfileFormState({ hasPassword: true }));

    expect(screen.getByLabelText('Previous password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm password')).toBeNull();
  });

  it('shows new+confirm password fields when hasPassword=false', () => {
    renderModal(buildProfileFormState({ hasPassword: false }));

    expect(screen.queryByLabelText('Previous password')).toBeNull();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('normalizes avatar URL and falls back to initial on image error', () => {
    renderModal(
      buildProfileFormState({
        avatarUrl: '//lh3.googleusercontent.com/photo',
        hasPassword: true,
      }),
    );

    const image = screen.getByAltText('Profile') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('https://lh3.googleusercontent.com/photo');

    fireEvent.error(image);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
