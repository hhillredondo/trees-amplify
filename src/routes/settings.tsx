import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useAuthMe, useDeleteAccount } from '@/hooks/useTreesApi'
import { updatePassword, type UpdatePasswordInput } from 'aws-amplify/auth'
import { signOut } from 'aws-amplify/auth'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

function SettingsPage() {
  const { data: authData, isLoading: authLoading } = useAuthMe()
  const deleteAccount = useDeleteAccount()

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // ─── Password Change ────────────────────────────────────────────────
  async function handlePasswordChange(e: { preventDefault: () => void }) {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)

    try {
      const input: UpdatePasswordInput = {
        oldPassword,
        newPassword,
      }
      await updatePassword(input)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordModal(false)
      setShowSuccessModal(true)
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to change password',
      )
    } finally {
      setPasswordLoading(false)
    }
  }

  // ─── Account Deletion ────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    setDeleteError(null)
    setDeleteLoading(true)

    try {
      // Delete from Flask (trees, roles, etc.)
      await deleteAccount.mutateAsync()
      // Sign out from Amplify
      await signOut()
      // Force redirect to / (will redirect to login)
      window.location.href = '/'
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleteLoading(false)
    }
  }

  const user = authData?.user

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Settings</h1>

      {authLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading settings…</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Account Information ──────────────────────────────────── */}
          <div className="bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Email Address
                </label>
                <p className="text-sm text-[var(--color-text-primary)]">{user?.email || 'Not available'}</p>
              </div>
            </div>
          </div>

          {/* ── Change Password ────────────────────────────────────────── */}
          <div className="bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Change Password</h2>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-lg hover:bg-[var(--color-accent)]/20 transition-colors cursor-pointer"
            >
              Change Password
            </button>
          </div>

          {/* ── Delete Account ──────────────────────────────────────────── */}
          <div className="bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-error)]/20 p-6">
            <h2 className="text-lg font-semibold text-[var(--color-error)] mb-2">Danger Zone</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Once you delete your account, there is no going back. All your trees, members, and
              data will be permanently deleted.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-error)] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ──────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowPasswordModal(false)
              setPasswordError(null)
              setOldPassword('')
              setNewPassword('')
              setConfirmPassword('')
            }}
            aria-label="Close modal"
          />
          <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md min-w-[320px] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Change Password</h3>

              {passwordError && (
                <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-4 py-3 text-sm text-[var(--color-error)]">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label
                    htmlFor="oldPassword"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Current Password <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="oldPassword"
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    New Password <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Must be at least 8 characters</p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Confirm New Password <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setPasswordError(null)
                      setOldPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={passwordLoading}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword}
                    className="px-5 py-2 text-sm font-medium text-[var(--color-on-accent)] bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {passwordLoading ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal ──────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false)
              setDeleteError(null)
              setDeleteConfirm('')
            }}
            aria-label="Close modal"
          />
          <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md min-w-[320px] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-[var(--color-error)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Delete Account</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                This will permanently delete your account and all associated data, including all
                trees you own, members, photos, and access permissions.
              </p>

              <div className="mb-4">
                <label
                  htmlFor="deleteConfirm"
                  className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                >
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  id="deleteConfirm"
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:border-transparent"
                />
              </div>

              {deleteError && (
                <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-4 py-3 text-sm text-[var(--color-error)]">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteError(null)
                    setDeleteConfirm('')
                  }}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== 'DELETE'}
                  className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-error)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                >
                  {deleteLoading ? 'Deleting…' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ───────────────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
            aria-label="Close modal"
          />
          <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md min-w-[320px] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-[var(--color-success)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Password Changed</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">Your password has been updated successfully</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-5 py-2 text-sm font-medium text-[var(--color-on-accent)] bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
