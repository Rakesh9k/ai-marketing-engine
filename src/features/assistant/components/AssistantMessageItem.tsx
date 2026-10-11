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
      <div className="flex max-w-[90%] items-start gap-3 sm:max-w-[80%]">
        {!isUser && (
          <div className="bg-brand-100 border-brand-200 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border">
            <MitraMascot pose="explain" size="sm" />
          </div>
        )}

        <div className="space-y-3">
          {/* Main Bubble */}
          <div
            className={`rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
              isUser
                ? 'bg-brand-600 rounded-br-xs font-medium text-white'
                : 'rounded-bl-xs border border-neutral-200/90 bg-white text-neutral-900'
            }`}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>

            {/* Rich Progress Steps */}
            {message.progressSteps && message.progressSteps.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-xs font-semibold">
                {message.progressSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {step.status === 'completed' && <span className="text-emerald-600">✓</span>}
                    {step.status === 'running' && (
                      <span className="border-brand-500 h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
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
                    <h4 className="text-xs font-bold text-neutral-900">
                      {message.productData.name}
                    </h4>
                    <p className="text-brand-600 text-xs font-black">
                      ₹{message.productData.price}
                    </p>
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white text-xs font-bold shadow-xs"
                      >
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
                    className="bg-white text-xs font-bold shadow-xs"
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

      <span className="px-2 text-[10px] font-medium text-neutral-400">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
