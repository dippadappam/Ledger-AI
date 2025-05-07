import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { categories } from "@/lib/categories";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const expenseFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().optional(),
  description: z.string().optional(),
  date: z.date({
    required_error: "Please select a date",
  }),
  isIncome: z.boolean().default(false),
}).refine((data) => {
  // Category is required only for expenses, not for income
  if (data.isIncome) {
    return true;
  }
  return !!data.category;
}, {
  message: "Please select a category for expenses",
  path: ["category"]
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExpenseForm({ open, onOpenChange }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isIncome, setIsIncome] = useState(false);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: undefined,
      category: "",
      description: "",
      date: new Date(),
      isIncome: false,
    },
  });
  
  const createTransaction = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      // Convert amount to cents for storage
      const amountInCents = Math.round(data.amount * 100);
      
      // Format the date as an ISO string for the API
      const formattedDate = data.date.toISOString();
      
      const payload = { 
        ...data, 
        amount: amountInCents,
        date: formattedDate 
      };
      
      console.log("Submitting transaction:", payload);
      const res = await apiRequest("POST", "/api/transactions", payload);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all transaction-related queries to update all views
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Get current month and year for analytics invalidation
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Invalidate the specific monthly transactions query for analytics page
      queryClient.invalidateQueries({ 
        queryKey: ["/api/transactions/month", currentYear, currentMonth]
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      
      toast({
        title: isIncome ? "Income added" : "Expense added",
        description: "Your transaction has been recorded.",
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      
      let errorMessage = "An unexpected error occurred";
      
      // Try to parse the error message if it's from our API
      if (error.message) {
        try {
          // If the error message is JSON, parse it
          if (typeof error.message === 'string' && error.message.includes('{')) {
            const parsed = JSON.parse(error.message);
            if (parsed.message) {
              errorMessage = Array.isArray(parsed.message) 
                ? parsed.message.map((e: any) => `${e.path}: ${e.message}`).join(', ')
                : parsed.message;
            }
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Failed to add transaction",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: ExpenseFormValues) {
    console.log("Form data before submission:", data);
    console.log("Is income?", isIncome);
    
    // Clone the data object to avoid mutation issues
    const submissionData = {...data};
    
    // For income, set a default category value if none is provided
    if (isIncome) {
      // Use "income" as the category for all income transactions
      submissionData.category = "income";
      console.log("Setting category to income");
    }
    
    console.log("Final submission data:", submissionData);
    createTransaction.mutate(submissionData);
  }
  
  const handleIncomeToggle = (checked: boolean) => {
    setIsIncome(checked);
    form.setValue("isIncome", checked);
    
    // Clear any category validation errors when toggling to income
    if (checked) {
      form.clearErrors("category");
      
      // We can clear the category field when switching to income
      // but we preserve it when switching back to expense
      form.setValue("category", "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {isIncome ? "Income" : "Expense"}</DialogTitle>
          <DialogDescription>
            Enter the details of your {isIncome ? "income" : "expense"} below.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center space-x-2 py-2">
              <span className="text-sm">Expense</span>
              <FormField
                control={form.control}
                name="isIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          handleIncomeToggle(checked);
                        }} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <span className="text-sm">Income</span>
            </div>
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₹</span>
                      </div>
                      <Input
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Only show category field for expenses, not for income */}
            {!isIncome && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center">
                              <category.icon className={`mr-2 h-4 w-4 ${category.color}`} />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add details about this transaction"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add {isIncome ? "Income" : "Expense"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
