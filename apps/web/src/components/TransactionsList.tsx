"use client";

import Image from "next/image";

interface Transaction {
  id: string;
  type: "sent" | "received" | "exchanged";
  amount: string;
  token: string;
  usdValue: string;
  time: string;
  date: string;
}

interface TransactionsListProps {
  transactions?: Transaction[];
}

// Mock data for now - replace with real data later
const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "sent",
    amount: "-100.00",
    token: "USDT",
    usdValue: "$99.99",
    time: "12:23:11",
    date: "Today, 14 Sep",
  },
  {
    id: "2",
    type: "received",
    amount: "+0.00113388",
    token: "BTC",
    usdValue: "$10,234.23",
    time: "12:23:11",
    date: "Today, 14 Sep",
  },
  {
    id: "3",
    type: "exchanged",
    amount: "0.0058459",
    token: "BTC",
    usdValue: "$10,234.23",
    time: "12:23:11",
    date: "13 September",
  },
  {
    id: "4",
    type: "received",
    amount: "+250.00",
    token: "USDT",
    usdValue: "$250.00",
    time: "10:15:30",
    date: "13 September",
  },
  {
    id: "5",
    type: "sent",
    amount: "-50.00",
    token: "USDT",
    usdValue: "$49.99",
    time: "09:45:22",
    date: "12 September",
  },
  {
    id: "6",
    type: "exchanged",
    amount: "0.0025000",
    token: "BTC",
    usdValue: "$2,234.50",
    time: "08:30:15",
    date: "12 September",
  },
  {
    id: "7",
    type: "received",
    amount: "+1000.00",
    token: "USDT",
    usdValue: "$1,000.00",
    time: "16:20:45",
    date: "11 September",
  },
  {
    id: "8",
    type: "sent",
    amount: "-200.00",
    token: "USDT",
    usdValue: "$199.98",
    time: "14:10:33",
    date: "11 September",
  },
  {
    id: "9",
    type: "received",
    amount: "+0.00500000",
    token: "BTC",
    usdValue: "$4,500.00",
    time: "11:55:12",
    date: "10 September",
  },
  {
    id: "10",
    type: "exchanged",
    amount: "0.0012500",
    token: "BTC",
    usdValue: "$1,123.75",
    time: "09:22:08",
    date: "10 September",
  },
];

function TransactionIcon({ type }: { type: Transaction["type"] }) {
  let iconSrc = "/icons/sent.svg";
  
  if (type === "received") {
    iconSrc = "/icons/received.svg";
  } else if (type === "exchanged") {
    iconSrc = "/icons/exchanged.svg";
  }

  return (
    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center flex-shrink-0">
      <Image
        src={iconSrc}
        alt={type}
        width={24}
        height={24}
        className="w-6 h-6"
      />
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const getAmountColor = () => {
    if (transaction.type === "sent") return "text-[#ff6b57]";
    if (transaction.type === "received") return "text-[#abff72]";
    return "text-white";
  };

  const getTypeLabel = () => {
    return transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
  };

  return (
    <div className="flex items-start gap-2 px-2 py-4 border-b border-[#2e313d]">
      <TransactionIcon type={transaction.type} />
      
      <div className="flex-1 min-w-0">
        {/* Top Row - Type and Amount */}
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-white text-base font-medium">
            {getTypeLabel()}
          </p>
          <p className={`text-base font-normal ${getAmountColor()}`}>
            {transaction.amount} {transaction.token}
          </p>
        </div>
        
        {/* Bottom Row - Time and USD Value */}
        <div className="flex items-center justify-between text-[#a3a3a5] text-sm uppercase">
          <p className="w-[100px]">{transaction.time}</p>
          <p>{transaction.usdValue}</p>
        </div>
      </div>
    </div>
  );
}

export function TransactionsList({ 
  transactions = mockTransactions,
}: TransactionsListProps) {
  // Group transactions by date
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.date]) {
      acc[transaction.date] = [];
    }
    acc[transaction.date].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="bg-[#1c1c1e] backdrop-blur-[10px] rounded-tl-3xl rounded-tr-2xl px-4 py-6 flex flex-col gap-4">
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <div key={date} className="flex flex-col gap-4">
          {/* Date Header */}
          <p className="text-[#a3a3a5] text-sm font-medium text-center">
            {date}
          </p>
          
          {/* Transactions for this date */}
          <div className="flex flex-col">
            {txs.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>
      ))}

      {/* End of list message */}
      <div className="flex items-center justify-center py-8">
        <p className="text-[#a3a3a5] text-xs font-medium">End of list</p>
      </div>
    </div>
  );
}

