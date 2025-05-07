import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppShell from "@/components/layout/app-shell";
import BalanceCard from "@/components/balance-card";
import AITipsCard from "@/components/ai-tips-card";
import TransactionItem from "@/components/transaction-item";
import ExpenseForm from "@/components/expense-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Lightbulb, TrendingUp, Target, Bell, ChevronRight } from "lucide-react";
import { Transaction, Insight } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [, navigate] = useLocation();
  
  // Fetch dashboard data
  const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch transactions
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch insights
  const { data: insights, isLoading: isInsightsLoading } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
    staleTime: 300000, // 5 minutes
  });
  
  const filteredTransactions = () => {
    if (!transactions) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (timeFilter) {
      case 'today':
        return transactions.filter(t => new Date(t.date) >= today);
      case 'week':
        return transactions.filter(t => new Date(t.date) >= thisWeek);
      case 'month':
        return transactions.filter(t => new Date(t.date) >= thisMonth);
      default:
        return transactions;
    }
  };

  return (
    <AppShell activeTab="dashboard">
      <div className="space-y-6">
        {/* Balance Card */}
        {isDashboardLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : (
          <BalanceCard 
            balance={dashboard?.balance ?? 0} 
            income={dashboard?.income ?? 0} 
            expenses={dashboard?.expenses ?? 0} 
          />
        )}
        
        {/* AI Tips Card */}
        {isInsightsLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <AITipsCard insights={insights || []} isLoading={isInsightsLoading} />
        )}
        
        {/* AI Insights Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium flex items-center">
                  <Lightbulb className="mr-2 h-5 w-5 text-purple-500" />
                  AI-Powered Financial Insights
                </CardTitle>
                <CardDescription>
                  Get personalized recommendations tailored to your financial habits
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border border-purple-100 flex items-start space-x-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Spending Forecasts</h3>
                  <p className="text-xs text-muted-foreground">Predict your next month's expenses</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100 flex items-start space-x-2">
                <div className="bg-green-100 p-2 rounded-full">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Smart Budget</h3>
                  <p className="text-xs text-muted-foreground">Get personalized budget suggestions</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100 flex items-start space-x-2">
                <div className="bg-amber-100 p-2 rounded-full">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Bill Reminders</h3>
                  <p className="text-xs text-muted-foreground">Never miss a recurring payment</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              onClick={() => navigate('/ai-insights')}
              className="w-full border-purple-200 hover:bg-purple-100/50"
            >
              Explore AI Insights
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        {/* Time Filters */}
        <Tabs defaultValue={timeFilter} onValueChange={setTimeFilter} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Transactions List */}
        <Card>
          <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {isTransactionsLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredTransactions().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No transactions yet</h3>
                <p className="mt-2 text-sm text-gray-500">Add your first transaction by clicking the + button</p>
              </div>
            ) : (
              filteredTransactions().map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))
            )}
          </CardContent>
        </Card>
        
        {/* Floating Action Button */}
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          onClick={() => setIsExpenseFormOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
        
        {/* Expense Form Dialog */}
        <ExpenseForm 
          open={isExpenseFormOpen} 
          onOpenChange={setIsExpenseFormOpen} 
        />
      </div>
    </AppShell>
  );
}
