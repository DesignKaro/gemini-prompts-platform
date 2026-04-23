'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ActionError } from '@/app/components/dashboard/action-error';
import { getInitial, normalizeAvatarUrl } from '@/lib/utils/avatar';

export type ProfileFormState = {
  name: string;
  handle: string;
  profileTitle: string;
  bio: string;
  focusTags: string[];
  avatarUrl: string;
  avatarUpdatedAt: string | null;
  hasPassword: boolean;
};

type ProfileSettingsModalProps = {
  isOpen: boolean;
  displayName: string;
  isProfileSaving: boolean;
  profileLoadError: string | null;
  profileSaveError: string | null;
  avatarPreview: string | null;
  profileForm: ProfileFormState;
  focusTagsInput: string;
  onRetryLoad: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onNameChange: (value: string) => void;
  onProfileTitleChange: (value: string) => void;
  onHandleChange: (value: string) => void;
  onFocusTagsInputChange: (value: string) => void;
  onBioChange: (value: string) => void;
  previousPassword: string;
  newPassword: string;
  confirmPassword: string;
  onPreviousPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
};

export function ProfileSettingsModal({
  isOpen,
  displayName,
  isProfileSaving,
  profileLoadError,
  profileSaveError,
  avatarPreview,
  profileForm,
  focusTagsInput,
  onRetryLoad,
  onClose,
  onSubmit,
  onAvatarChange,
  onRemoveAvatar,
  onNameChange,
  onProfileTitleChange,
  onHandleChange,
  onFocusTagsInputChange,
  onBioChange,
  previousPassword,
  newPassword,
  confirmPassword,
  onPreviousPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
}: ProfileSettingsModalProps) {
  const avatarSrc = useMemo(
    () => normalizeAvatarUrl(avatarPreview || profileForm.avatarUrl || null),
    [avatarPreview, profileForm.avatarUrl],
  );
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  const hasPassword = profileForm.hasPassword;
  const showPasswordSetFlow = !hasPassword;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0f141fcc] px-4 py-6">
      <div className="no-scrollbar w-full max-w-[560px] max-h-[80vh] overflow-y-auto rounded-[18px] bg-white p-4 shadow-2xl sm:rounded-[24px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.8rem] text-[#7a8292]">Profile</p>
            <h2 className="text-[1.25rem] font-medium text-[#0f1116] sm:text-[1.4rem]">
              Edit profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e1e5ee] text-[#6a7280] transition-colors hover:border-[#0f1116] hover:text-[#0f1116]"
            aria-label="Close edit profile"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={onSubmit}>
          {profileLoadError ? <ActionError error={profileLoadError} onRetry={onRetryLoad} /> : null}
          {profileSaveError ? <ActionError error={profileSaveError} /> : null}

          <div className="grid gap-4 sm:grid-cols-[170px_1fr] sm:items-start">
            <div>
              <span className="text-[0.8rem] text-[#7a8292]">Profile photo</span>
              <div className="mt-2 flex items-start gap-3 sm:flex-col sm:gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-[#f0f2f7]">
                  {avatarSrc && !avatarLoadError ? (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                      referrerPolicy="no-referrer"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[0.9rem] font-medium text-[#9aa3b2]">
                      {getInitial(displayName)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className="cursor-pointer text-[0.8rem] text-[#1e4fd2]">
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={onAvatarChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={onRemoveAvatar}
                    className="text-left text-[0.75rem] text-[#7a8292]"
                  >
                    Remove photo
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[0.8rem] text-[#7a8292]">Full name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(event) => onNameChange(event.target.value)}
                  className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
                />
              </div>
              <div>
                <label className="text-[0.8rem] text-[#7a8292]">Role</label>
                <input
                  type="text"
                  value={profileForm.profileTitle}
                  onChange={(event) => onProfileTitleChange(event.target.value)}
                  className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[0.8rem] text-[#7a8292]">Handle</label>
              <input
                type="text"
                value={profileForm.handle}
                onChange={(event) => onHandleChange(event.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
              />
            </div>
            <div>
              <label className="text-[0.8rem] text-[#7a8292]">Focus tags</label>
              <input
                type="text"
                value={focusTagsInput}
                onChange={(event) => onFocusTagsInputChange(event.target.value)}
                placeholder="design, ai, writing"
                className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
              />
              <p className="mt-1 text-[0.72rem] text-[#9aa3b2]">Separate tags with commas.</p>
            </div>
          </div>

          <div>
            <label className="text-[0.8rem] text-[#7a8292]">Bio</label>
            <textarea
              value={profileForm.bio}
              onChange={(event) => onBioChange(event.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2 sm:rows-3"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {showPasswordSetFlow ? (
              <>
                <label className="block">
                  <span className="text-[0.8rem] text-[#7a8292]">New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => onNewPasswordChange(event.target.value)}
                    autoComplete="new-password"
                    className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.8rem] text-[#7a8292]">Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                    autoComplete="new-password"
                    className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-[0.8rem] text-[#7a8292]">Previous password</span>
                  <input
                    type="password"
                    value={previousPassword}
                    onChange={(event) => onPreviousPasswordChange(event.target.value)}
                    autoComplete="current-password"
                    className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.8rem] text-[#7a8292]">New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => onNewPasswordChange(event.target.value)}
                    autoComplete="new-password"
                    className="mt-1.5 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] sm:mt-2"
                  />
                </label>
              </>
            )}
          </div>
          <p className="text-[0.72rem] text-[#9aa3b2]">
            {showPasswordSetFlow
              ? 'Set a password if you want email/password login in addition to Google.'
              : 'Leave password fields empty if you do not want to change your password.'}
          </p>

          <div className="flex items-center justify-end gap-2 border-t border-[#eef1f6] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.85rem] text-[#0f1116]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProfileSaving}
              className="rounded-full bg-[#0f1116] px-4 py-2 text-[0.85rem] text-white disabled:opacity-60"
            >
              {isProfileSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
