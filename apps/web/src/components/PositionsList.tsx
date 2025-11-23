"use client";

import Image from "next/image";
import { usePositions } from "@/hooks/usePositions";
import { useFlashLoanActivity } from "@/hooks/useFlashLoanActivity";

interface PositionsListProps {
  userAddress?: string;
}

function PositionItem({ 
  liquidityAmount, 
  feesEarned, 
  loanCount,
  strategyHash 
}: { 
  liquidityAmount: string;
  feesEarned: string;
  loanCount: number;
  strategyHash: string;
}) {
  const shortHash = `${strategyHash.slice(0, 6)}...${strategyHash.slice(-4)}`;
  const hasActivity = loanCount > 0;

  return (
    <div className="flex items-start gap-2 px-2 py-4 border-b border-[#2e313d]">
      <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center flex-shrink-0">
        <Image
          src="/icons/money.svg"
          alt="Position"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Top Row - Position Hash and Liquidity */}
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-white text-base font-medium">
            Position {shortHash}
          </p>
          <p className="text-base font-normal text-[#abff72]">
            {parseFloat(liquidityAmount).toFixed(2)} USDC
          </p>
        </div>
        
        {/* Bottom Row - Activity Stats */}
        <div className="flex items-center justify-between text-[#a3a3a5] text-sm">
          <p>
            {loanCount === 0 ? 'No activity yet' : `${loanCount} loan${loanCount > 1 ? 's' : ''}`}
          </p>
          <p className={hasActivity ? 'text-[#abff72]' : ''}>
            {hasActivity ? `+${parseFloat(feesEarned).toFixed(4)} USDC earned` : 'Ready to earn'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  borrower,
  amount,
  fee,
  timestamp,
}: {
  borrower: string;
  amount: string;
  fee: string;
  timestamp: Date;
}) {
  const shortBorrower = `${borrower.slice(0, 6)}...${borrower.slice(-4)}`;
  const timeAgo = getTimeAgo(timestamp);

  return (
    <div className="flex items-start gap-2 px-2 py-4 border-b border-[#2e313d]">
      <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center flex-shrink-0">
        <Image
          src="/icons/exchanged.svg"
          alt="Loan"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Top Row - Borrower and Amount */}
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-white text-base font-medium">
            Flash Loan to {shortBorrower}
          </p>
          <p className="text-base font-normal text-white">
            {parseFloat(amount).toFixed(2)} USDC
          </p>
        </div>
        
        {/* Bottom Row - Time and Fee */}
        <div className="flex items-center justify-between text-[#a3a3a5] text-sm uppercase">
          <p>{timeAgo}</p>
          <p className="text-[#abff72]">+{parseFloat(fee).toFixed(4)} USDC</p>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-start gap-2 px-2 py-4 border-b border-[#2e313d] animate-pulse">
      <div className="w-8 h-8 rounded-full bg-[#2e313d]"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#2e313d] rounded w-3/4"></div>
        <div className="h-3 bg-[#2e313d] rounded w-1/2"></div>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-[#2e313d] flex items-center justify-center mb-4">
        <Image
          src="/icons/list.svg"
          alt="Empty"
          width={32}
          height={32}
          className="opacity-50"
        />
      </div>
      <p className="text-white text-base font-medium mb-1">{title}</p>
      <p className="text-[#a3a3a5] text-sm text-center">{message}</p>
    </div>
  );
}

export function PositionsList({ userAddress }: PositionsListProps) {
  const { positions, isLoading: positionsLoading } = usePositions(userAddress);
  const { activities, isLoading: activitiesLoading } = useFlashLoanActivity(userAddress, 5);

  const isLoading = positionsLoading || activitiesLoading;
  const hasPositions = positions.length > 0;
  const hasActivity = activities.length > 0;

  return (
    <div className="bg-[#1c1c1e] backdrop-blur-[10px] rounded-tl-3xl rounded-tr-2xl px-4 py-6 flex flex-col gap-4">
      {/* Positions Section */}
      {isLoading && !hasPositions && (
        <>
          <p className="text-[#a3a3a5] text-sm font-medium text-center">Loading positions...</p>
          <LoadingSkeleton />
          <LoadingSkeleton />
        </>
      )}

      {!isLoading && !hasPositions && (
        <EmptyState
          title="No Active Positions"
          message="Deposit liquidity to start earning fees from flash loans"
        />
      )}

      {hasPositions && (
        <>
          <p className="text-[#a3a3a5] text-sm font-medium text-center">
            Your Positions ({positions.length})
          </p>
          <div className="flex flex-col">
            {positions.map((position) => (
              <PositionItem
                key={position.strategyHash}
                liquidityAmount={position.liquidityAmount}
                feesEarned={position.feesEarned}
                loanCount={position.loanCount}
                strategyHash={position.strategyHash}
              />
            ))}
          </div>
        </>
      )}

      {/* Recent Activity Section */}
      {hasActivity && (
        <>
          <p className="text-[#a3a3a5] text-sm font-medium text-center mt-4">
            Recent Activity
          </p>
          <div className="flex flex-col">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                borrower={activity.borrower}
                amount={activity.amount}
                fee={activity.fee}
                timestamp={activity.timestamp}
              />
            ))}
          </div>
        </>
      )}

      {/* End of list message */}
      <div className="flex items-center justify-center py-8">
        <p className="text-[#a3a3a5] text-xs font-medium">
          {hasPositions || hasActivity ? 'End of list' : 'Start by depositing liquidity'}
        </p>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

