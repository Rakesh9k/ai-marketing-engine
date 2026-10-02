'use client';

import { useState, useEffect, useCallback } from 'react';
import { metaService } from '../services/metaService';
import type { SocialConnection, PendingMetaPage } from '@/types';
import { Button } from '@/components/ui/Button';

interface SocialAccountsSectionProps {
  businessId?: string;
  initialStateId?: string;
  onConnectionChange?: () => void;
}

export function SocialAccountsSection({
  businessId,
  initialStateId,
  onConnectionChange,
}: SocialAccountsSectionProps) {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initiating, setInitiating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states for Page Selection
  const [stateId, setStateId] = useState<string | null>(initialStateId || null);
  const [pendingPages, setPendingPages] = useState<PendingMetaPage[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);
  const [selectingPageId, setSelectingPageId] = useState<string | null>(null);

  // Disconnect modal state
  const [disconnectingConn, setDisconnectingConn] = useState<SocialConnection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await metaService.listSocialConnections(businessId);
      setConnections(res.connections || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load social connections';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadPendingPages = useCallback(async (sid: string) => {
    setLoadingPending(true);
    setError(null);
    try {
      const res = await metaService.getPendingMetaPages(sid);
      setPendingPages(res.pages || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load candidate Facebook Pages';
      setError(msg);
      setStateId(null);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    if (initialStateId) {
      setStateId(initialStateId);
      void loadPendingPages(initialStateId);
    }
  }, [initialStateId, loadPendingPages]);

  const handleConnect = async () => {
    setInitiating(true);
    setError(null);
    try {
      const res = await metaService.initiateMetaOAuth();
      window.location.href = res.authUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate Meta connection';
      setError(msg);
      setInitiating(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    if (!stateId) return;
    setSelectingPageId(pageId);
    setError(null);
    try {
      await metaService.selectMetaPage(stateId, pageId, businessId);
      setSuccess('Successfully connected Meta account!');
      setStateId(null);
      setPendingPages([]);
      await fetchConnections();
      if (onConnectionChange) onConnectionChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to select Facebook Page';
      setError(msg);
    } finally {
      setSelectingPageId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectingConn) return;
    setIsDisconnecting(true);
    setError(null);
    try {
      await metaService.disconnectMetaConnection(disconnectingConn.connectionId);
      setSuccess('Disconnected Meta connection.');
      setDisconnectingConn(null);
      await fetchConnections();
      if (onConnectionChange) onConnectionChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect Meta account';
      setError(msg);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Social Accounts & Publishing
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connect Meta (Facebook & Instagram) to publish marketing campaigns and creatives
            directly.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="animate-pulse text-sm text-slate-500 dark:text-slate-400">
            Loading social connections...
          </p>
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                  Meta (Facebook & Instagram)
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No account connected yet.
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              disabled={initiating}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {initiating ? 'Connecting to Meta...' : 'Connect Facebook & Instagram'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <div
              key={conn.connectionId}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      Connected
                    </span>
                    <span className="text-xs text-slate-400">ID: {conn.connectionId}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Facebook Details */}
                    <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/60">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Facebook Page</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {conn.facebookPage.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Page ID: {conn.facebookPage.id}
                      </p>
                    </div>

                    {/* Instagram Details */}
                    <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/60">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-pink-600 dark:text-pink-400">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        <span>Instagram Professional</span>
                      </div>
                      {conn.instagram?.id ? (
                        <>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                            @{conn.instagram.username || conn.instagram.name || 'Instagram Account'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {conn.instagram.id}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          Not linked (Facebook publishing only)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-end gap-2 sm:flex-col">
                  <Button
                    variant="outline"
                    onClick={() => setDisconnectingConn(conn)}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Page Selection Modal */}
      {stateId && (
        <div className="backdrop-sm fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Select Facebook Page to Connect
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose which Facebook Page and linked Instagram account you want Mitra to publish to.
            </p>

            {loadingPending ? (
              <div className="animate-pulse py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Fetching candidate Facebook Pages...
              </div>
            ) : pendingPages.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No Facebook Pages found for your Meta account, or access was not granted. Please
                check your permissions and try connecting again.
              </div>
            ) : (
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {pendingPages.map((page) => (
                  <div
                    key={page.pageId}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {page.pageName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ID: {page.pageId}
                        </p>

                        <div className="mt-2.5">
                          {page.instagramAccount?.id ? (
                            <div className="flex items-center space-x-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <span>
                                ✓ Linked Instagram: @
                                {page.instagramAccount.username || page.instagramAccount.name}
                              </span>
                            </div>
                          ) : (
                            <div className="rounded bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              ⚠️ No Instagram Professional account linked to this Page. You can
                              still publish to Facebook.
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSelectPage(page.pageId)}
                        disabled={selectingPageId === page.pageId}
                        className="shrink-0 bg-blue-600 text-xs text-white hover:bg-blue-700"
                      >
                        {selectingPageId === page.pageId ? 'Connecting...' : 'Select Page'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStateId(null);
                  setPendingPages([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectingConn && (
        <div className="backdrop-sm fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Disconnect Meta Account?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to disconnect Facebook Page &ldquo;
              {disconnectingConn.facebookPage.name}&rdquo;? This will remove Mitra publishing
              authorization.
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setDisconnectingConn(null)}
                disabled={isDisconnecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
