import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign } from "lucide-react";

const priceConfigSchema = z.object({
  lowPrice: z.number().min(0, "Low price must be positive"),
  highPrice: z.number().min(0, "High price must be positive"),
  priceLevels: z.number().min(2).max(5)
}).refine(data => data.highPrice > data.lowPrice, {
  message: "High price must be greater than low price",
  path: ["highPrice"]
});

type PriceConfigForm = z.infer<typeof priceConfigSchema>;

type ProductPriceConfigProps = {
  productId: number;
  productName: string;
  listPrice: number;
  currentLowPrice?: number | null;
  currentHighPrice?: number | null;
  currentPriceLevels?: number | null;
};

export function ProductPriceConfig({
  productId,
  productName,
  listPrice,
  currentLowPrice = null,
  currentHighPrice = null,
  currentPriceLevels = null,
}: ProductPriceConfigProps) {
  const [configPriceOpen, setConfigPriceOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const priceConfigForm = useForm<PriceConfigForm>({
    resolver: zodResolver(priceConfigSchema),
    defaultValues: {
      lowPrice: currentLowPrice ? currentLowPrice / 100 : listPrice * 0.8 / 100,
      highPrice: currentHighPrice ? currentHighPrice / 100 : listPrice * 1.2 / 100,
      priceLevels: currentPriceLevels || 3
    }
  });

  const updateProductPriceMutation = useMutation({
    mutationFn: async (data: PriceConfigForm) => {
      const response = await fetch(`/api/products/${productId}/price-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lowPrice: Math.round(data.lowPrice * 100),
          highPrice: Math.round(data.highPrice * 100),
          priceLevels: data.priceLevels
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shelves"] });
      toast({
        title: "Success",
        description: "Product price configuration updated successfully",
      });
      setConfigPriceOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setConfigPriceOpen(true)}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Configure Price
      </Button>

      <Dialog open={configPriceOpen} onOpenChange={setConfigPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Product Price</DialogTitle>
            <DialogDescription>
              Set the price range and levels for {productName}
            </DialogDescription>
          </DialogHeader>
          <Form {...priceConfigForm}>
            <form onSubmit={priceConfigForm.handleSubmit((data) => updateProductPriceMutation.mutate(data))} className="space-y-4">
              <FormField
                control={priceConfigForm.control}
                name="lowPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={priceConfigForm.control}
                name="highPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>High Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={priceConfigForm.control}
                name="priceLevels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Levels</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select number of price levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 (Low and High)</SelectItem>
                        <SelectItem value="3">3 (Low, Med, High)</SelectItem>
                        <SelectItem value="4">4 Levels</SelectItem>
                        <SelectItem value="5">5 Levels</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setConfigPriceOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProductPriceMutation.isPending}>
                  {updateProductPriceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}