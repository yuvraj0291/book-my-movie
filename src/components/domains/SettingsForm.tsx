"use client";

import React, { useState } from "react";
import { 
  updateProfileAction, 
  generate2FASecretAction, 
  enable2FAAction, 
  disable2FAAction 
} from "@/app/actions/authActions";
import { motion, AnimatePresence } from "framer-motion";
import { User, Image, Lock, Shield, ShieldCheck, ShieldAlert, Key, Clipboard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface SettingsFormProps {
  initialUser: {
    name: string;
    email: string;
    image: string;
    twoFactorEnabled: boolean;
  };
}

export function SettingsForm({ initialUser }: SettingsFormProps) {
  // Profile state
  const [profileName, setProfileName] = useState(initialUser.name);
  const [profileImage, setProfileImage] = useState(initialUser.image);
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ error?: string; success?: string }>({});

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialUser.twoFactorEnabled);
  const [otpCode, setOtpCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ error?: string; success?: string }>({});
  
  // 2FA Setup states
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // Profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileStatus({});

    try {
      const data: Record<string, string> = {};
      if (profileName !== initialUser.name) data.name = profileName;
      if (profileImage !== initialUser.image) data.image = profileImage;
      if (newPassword) data.password = newPassword;

      if (Object.keys(data).length === 0) {
        setProfileStatus({ error: "No changes to update." });
        setProfileLoading(false);
        return;
      }

      const res = await updateProfileAction(data);
      if (res.error) {
        setProfileStatus({ error: res.error });
      } else {
        setProfileStatus({ success: "Profile updated successfully!" });
        setNewPassword("");
      }
    } catch (err) {
      setProfileStatus({ error: "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  // Begin 2FA Enable Setup
  const handleStartSetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorStatus({});

    try {
      const res = await generate2FASecretAction();
      if ("error" in res) {
        setTwoFactorStatus({ error: res.error });
      } else if (res.secret && res.qrCodeUrl) {
        setSetupData({ secret: res.secret, qrCodeUrl: res.qrCodeUrl });
        setShowSetup(true);
      }
    } catch (err) {
      setTwoFactorStatus({ error: "Failed to start 2FA setup." });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Verify and Confirm 2FA Enable
  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setTwoFactorLoading(true);
    setTwoFactorStatus({});

    try {
      const res = await enable2FAAction(setupData.secret, otpCode);
      if (res.error) {
        setTwoFactorStatus({ error: res.error });
      } else if (res.success && res.backupCodes) {
        setBackupCodes(res.backupCodes);
        setTwoFactorEnabled(true);
        setTwoFactorStatus({ success: "2FA successfully enabled! Please copy your recovery codes." });
        setOtpCode("");
      }
    } catch (err) {
      setTwoFactorStatus({ error: "Verification failed." });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorStatus({});

    try {
      const res = await disable2FAAction(otpCode);
      if (res.error) {
        setTwoFactorStatus({ error: res.error });
      } else if (res.success) {
        setTwoFactorEnabled(false);
        setShowSetup(false);
        setSetupData(null);
        setBackupCodes(null);
        setTwoFactorStatus({ success: "Two-factor authentication disabled." });
        setOtpCode("");
      }
    } catch (err) {
      setTwoFactorStatus({ error: "Failed to disable 2FA." });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    alert("Recovery codes copied to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Profile Management Card */}
      <div className="p-6 rounded-2xl glass border border-white/5 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <span>Profile Details</span>
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {profileStatus.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{profileStatus.error}</span>
            </div>
          )}
          {profileStatus.success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{profileStatus.success}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Email Address (Read-only)</label>
            <input
              type="email"
              disabled
              value={initialUser.email}
              className="w-full bg-zinc-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Full Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-zinc-500"><User className="w-4 h-4" /></span>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Avatar URL</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-zinc-500"><Image className="w-4 h-4" /></span>
              <input
                type="text"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Update Password (Leave blank to keep current)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-zinc-500"><Lock className="w-4 h-4" /></span>
              <input
                type="password"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder-zinc-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Save Profile Updates</span>
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="p-6 rounded-2xl glass border border-white/5 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span>Two-Factor Authentication (2FA)</span>
        </h2>

        {twoFactorStatus.error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{twoFactorStatus.error}</span>
          </div>
        )}
        {twoFactorStatus.success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{twoFactorStatus.success}</span>
          </div>
        )}

        <div className="bg-white/3 rounded-xl p-4 border border-white/5 flex items-start gap-4">
          {twoFactorEnabled ? (
            <>
              <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Two-Factor Authentication is Enabled</h4>
                <p className="text-xs text-zinc-400 font-light mt-1 leading-relaxed">
                  Your account is protected by an additional security verification code required on login.
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Two-Factor Authentication is Disabled</h4>
                <p className="text-xs text-zinc-400 font-light mt-1 leading-relaxed">
                  Add an extra layer of security to your account by scanning a secure authenticator QR code.
                </p>
              </div>
            </>
          )}
        </div>

        {/* 2FA SETUP UI */}
        <AnimatePresence mode="wait">
          {!twoFactorEnabled && !showSetup && (
            <button
              onClick={handleStartSetup}
              disabled={twoFactorLoading}
              className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {twoFactorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Configure Authenticator App</span>
            </button>
          )}

          {!twoFactorEnabled && showSetup && setupData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 border-t border-white/5 pt-6"
            >
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Step 1: Scan this QR Code</h4>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.) and scan the QR code below.
                </p>
                <div className="bg-white p-3 rounded-lg w-44 h-44 mx-auto flex items-center justify-center">
                  <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-zinc-500 block font-light">Or enter this code manually:</span>
                  <code className="text-xs font-mono text-primary font-bold bg-white/5 px-2 py-0.5 rounded mt-1 inline-block select-all">{setupData.secret}</code>
                </div>
              </div>

              <form onSubmit={handleConfirmEnable} className="space-y-3 border-t border-white/5 pt-4">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Step 2: Enter Verification Code</h4>
                <p className="text-xs text-zinc-400 font-light">
                  Type the 6-digit code shown in your authenticator app to complete setup.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-zinc-500"><Key className="w-4 h-4" /></span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-650 tracking-wider"
                  />
                </div>
                <button
                  type="submit"
                  disabled={twoFactorLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {twoFactorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Verify and Enable 2FA</span>
                </button>
              </form>
            </motion.div>
          )}

          {twoFactorEnabled && backupCodes && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 border-t border-white/5 pt-6"
            >
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Save Your Recovery Codes!</span>
                </h4>
                <p className="text-[10px] text-zinc-400 font-light leading-relaxed">
                  These codes can be used to log in if you lose access to your authenticator app. Each code can only be used once. Store them in a secure place!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-4 rounded-xl border border-white/5 font-mono text-xs text-center text-zinc-300">
                {backupCodes.map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyBackupCodes}
                  className="flex-1 py-2.5 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Copy Codes</span>
                </button>
                <button
                  onClick={() => setBackupCodes(null)}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Finished Setup
                </button>
              </div>
            </motion.div>
          )}

          {twoFactorEnabled && !backupCodes && (
            <form onSubmit={handleDisable} className="space-y-4 border-t border-white/5 pt-6">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Disable 2FA Security</h4>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                To turn off two-factor authentication, enter a code from your authenticator app below to confirm.
              </p>
              
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-500"><Key className="w-4 h-4" /></span>
                <input
                  type="text"
                  required
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-650"
                />
              </div>

              <button
                type="submit"
                disabled={twoFactorLoading}
                className="w-full py-3 bg-red-650 hover:bg-red-600 text-white font-bold text-sm rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {twoFactorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Verify and Disable 2FA</span>
              </button>
            </form>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
