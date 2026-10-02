'use client';

import Link from 'next/link';
import type { AssistantMessage } from '../types';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Button } from '@/components/ui/Button';

interface AssistantMessageItemProps {
  message: AssistantMessage;
  onActionClick?: (action: any) => void;
}

export function AssistantMessageItem({ message, onActionClick }: AssistantMessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
      <div className="flex items-start gap-3 max-w-[90%] sm:max-w-[80%]">
        {!isUser && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-100 border border-brand-200">
            <MitraMascot pose="explain" size="sm" />
          </div>
        )}

        <div className="space-y-3">
          {/* Main Bubble */}
          <div
            className={`rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
              isUser
                ? 'bg-brand-600 text-white rounded-br-xs font-medium'
                : 'bg-white border border-neutral-200/90 text-neutral-900 rounded-bl-xs'
            }`}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>

            {/* Rich Progress Steps */}
            {message.progressSteps && message.progressSteps.length > 0 && (
              <div className="mt-3 space-y-1.5 pt-3 border-t border-neutral-100 text-xs font-semibold">
                {message.progressSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {step.status === 'completed' && <span className="text-emerald-600">✓</span>}
                    {step.status === 'running' && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    )}
                    {step.status === 'pending' && <span className="text-neutral-400">○</span>}
                    {step.status === 'failed' && <span className="text-red-500">✗</span>}
                    <span
                      className={
                        step.status === 'completed'
                          ? 'text-emerald-800'
                          : step.status === 'running'
                          ? 'text-brand-700 font-bold'
                          : 'text-neutral-500'
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Product Card embed */}
            {message.productData && (
              <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
                <div className="flex items-center gap-3">
                  {message.productData.images?.[0]?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.productData.images[0].url}
                      alt={message.productData.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-xs text-neutral-900">{message.productData.name}</h4>
                    <p className="text-xs font-black text-brand-600">₹{message.productData.price}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.actions.map((act) => {
                if (act.url) {
                  return (
                    <Link key={act.id} href={act.url}>
                      <Button size="sm" variant="outline" className="text-xs font-bold bg-white shadow-xs">
                        {act.label} →
                      </Button>
                    </Link>
                  );
                }
                return (
                  <Button
                    key={act.id}
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold bg-white shadow-xs"
                    onClick={() => onActionClick?.(act)}
                  >
                    {act.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <span className="text-[10px] text-neutral-400 font-medium px-2">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
