import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const configurationSchema = z.object({
  priceLevels: z.coerce
    .number()
    .min(2, "Must have at least 2 price levels")
    .max(5, "Cannot have more than 5 price levels"),
});

type ConfigurationForm = z.infer<typeof configurationSchema>;

interface ShelfData {
  id: number;
  products: Array<{
    id: number;
    productName: string;
    listPrice: number;
    lowPrice?: number;
    highPrice?: number;
  }>;
}

interface ConjointConfig {
  id: number;
  shelfId: number;
  priceLevels: number;
  combinationCount: number;
  estimatedDuration: number;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function generatePriceLevels(product: ShelfData['products'][0], levels: number): number[] {
  const lowPrice = product.lowPrice || Math.round(product.listPrice * 0.8);
  const highPrice = product.highPrice || Math.round(product.listPrice * 1.2);
  const listPrice = product.listPrice;

  if (levels === 2) {
    return [lowPrice, highPrice];
  } else if (levels === 3) {
    return [lowPrice, listPrice, highPrice];
  } else if (levels === 4) {
    const quarterPoint = Math.round(lowPrice + (listPrice - lowPrice) / 2);
    const threeQuarterPoint = Math.round(listPrice + (highPrice - listPrice) / 2);
    return [lowPrice, quarterPoint, threeQuarterPoint, highPrice];
  } else if (levels === 5) {
    const p1 = Math.round(lowPrice + (listPrice - lowPrice) / 3);
    const p2 = Math.round(lowPrice + 2 * (listPrice - lowPrice) / 3);
    const p3 = Math.round(listPrice + (highPrice - listPrice) / 3);
    const p4 = Math.round(listPrice + 2 * (highPrice - listPrice) / 3);
    return [lowPrice, p1, p2, p3, p4, highPrice];
  }

  return [lowPrice, listPrice, highPrice];
}

export default function ConjointConfiguration() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shelfData, isLoading: isLoadingShelf } = useQuery<ShelfData>({
    queryKey: [`/api/shelves/${id}`],
  });

  const form = useForm<ConfigurationForm>({
    resolver: zodResolver(configurationSchema),
    defaultValues: {
      priceLevels: 3,
    },
  });

  const { mutate: saveConfiguration, isPending } = useMutation<
    ConjointConfig,
    Error,
    ConfigurationForm
  >({
    mutationFn: async (data: ConfigurationForm) => {
      const response = await fetch(`/api/shelves/${id}/conjoint-configuration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/shelves/${id}`] });
      toast({
        title: "Success",
        description: "Configuration saved successfully",
      });
      navigate(`/shelf-setup`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingShelf) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  function onSubmit(data: ConfigurationForm) {
    saveConfiguration(data);
  }

  const combinationCount = Math.pow(form.watch("priceLevels"), shelfData?.products?.length || 0);
  const estimatedDuration = combinationCount * 30; // 30 seconds per combination

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Configure Conjoint Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="priceLevels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Price Levels</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={2} 
                        max={5} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose how many price points to test between low and high prices (2-5).
                      For example, 3 levels are (Low, Med, High) prices.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Price Points Preview</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>List Price</TableHead>
                      <TableHead>Price Points in Survey</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shelfData?.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>{formatPrice(product.listPrice)}</TableCell>
                        <TableCell>
                          {generatePriceLevels(product, form.watch("priceLevels"))
                            .map(price => formatPrice(price))
                            .join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted p-4 rounded-md space-y-2">
                <p><strong>Generated Combinations:</strong> {combinationCount}</p>
                <p><strong>Estimated Survey Duration:</strong> {Math.round(estimatedDuration / 60)} minutes</p>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}