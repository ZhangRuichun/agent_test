import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Users, Package, Settings2, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductPriceConfig } from "@/components/product-price-config";

// Schema for creating a new shelf
const createShelfSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

type CreateShelfForm = z.infer<typeof createShelfSchema>;
type Shelf = {
  id: number;
  projectName: string;
  description: string | null;
  products: Array<{
    product: Product;
  }>;
  personas: Array<{ persona: { id: number; name: string } }>;
};

type Product = {
  id: number;
  brandName: string;
  productName: string;
  description: string;
  listPrice: number;
  cost?: number;
  lowPrice?: number;
  highPrice?: number;
  priceLevels?: number;
  benefits?: string;
  images?: { id: number; url: string }[];
  newProduct?: string;
  packSize?: string;
  volumeSize?: string;
};

type Persona = {
  id: number;
  name: string;
};

type ConjointConfig = {
  priceLevels: number;
  combinations: Array<{
    products: Array<{ productId: number; price: number }>;
    estimatedTime: number;
  }>;
};

const conjointConfigSchema = z.object({
  priceLevels: z.number().min(2).max(5),
});

type ConjointConfigForm = z.infer<typeof conjointConfigSchema>;

// Fetch function types
type FetchError = {
  response?: {
    status: number;
  };
  message: string;
};

const useShelvesQuery = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useQuery<Shelf[], FetchError>({
    queryKey: ["/api/shelves"],
    queryFn: async () => {
      const response = await fetch("/api/shelves", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/auth");
        }
        throw new Error("Failed to load shelves");
      }
      return response.json();
    },
  });
};

const usePersonasQuery = () => {
  const [, setLocation] = useLocation();
  return useQuery<Persona[], FetchError>({
    queryKey: ["/api/personas"],
    queryFn: async () => {
      const response = await fetch("/api/personas", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/auth");
        }
        throw new Error("Failed to load personas");
      }
      return response.json();
    },
  });
};

const useProductsQuery = () => {
  const [, setLocation] = useLocation();
  return useQuery<Product[], FetchError>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/auth");
        }
        throw new Error("Failed to load products");
      }
      return response.json();
    },
  });
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Update helper function to handle image URLs and add logging
function getImageUrl(url: string): string {
  console.log('Original image URL:', url);
  if (!url) {
    console.log('No URL provided, using placeholder');
    return '/assets/placeholder-product.png';
  }
  // Handle both absolute and relative paths
  if (url.startsWith('http')) {
    return url;
  }
  // Ensure the URL has the correct /uploads prefix
  return url.startsWith('/uploads/') ? url : `/uploads/${url}`;
}


// Add new type for price configuration
type PriceConfig = {
  lowPrice: number;
  highPrice: number;
  priceLevels: number;
};

// Add new schema for price configuration
const priceConfigSchema = z.object({
  lowPrice: z.number().min(0, "Low price must be positive"),
  highPrice: z.number().min(0, "High price must be positive"),
  priceLevels: z.number().min(2).max(5)
}).refine(data => data.highPrice > data.lowPrice, {
  message: "High price must be greater than low price",
  path: ["highPrice"]
});

type PriceConfigForm = z.infer<typeof priceConfigSchema>;

// Update the calculation function to be more accurate
function calculateShelfMetrics(products: Array<{ product: Product }>, overridePriceLevels?: number) {
  const totalCombinations = products.reduce((acc, p) => {
    // Use override price levels if provided, otherwise use product's configured levels or default to 3
    const priceLevels = overridePriceLevels || p.product.priceLevels || 3;
    return acc * priceLevels;
  }, 1);

  const minSampleSize = Math.ceil(totalCombinations * 1.5);
  const estimatedTime = Math.ceil(totalCombinations * 0.5);
  
  return {
    totalCombinations,
    minSampleSize,
    estimatedTime
  };
}

export default function ShelfSetup() {
  const [open, setOpen] = useState(false);
  const [configPersonasOpen, setConfigPersonasOpen] = useState<number | null>(null);
  const [configProductsOpen, setConfigProductsOpen] = useState<number | null>(null);
  const [configConjointOpen, setConfigConjointOpen] = useState<number | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState<Set<number>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shelves = [], isLoading: isLoadingShelves, error: shelvesError } = useShelvesQuery();
  const { data: personas = [], isLoading: isLoadingPersonas, error: personasError } = usePersonasQuery();
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useProductsQuery();

  // Add debug logging for shelf data
  console.log('Shelves data:', shelves);

  const form = useForm<CreateShelfForm>({
    resolver: zodResolver(createShelfSchema),
    defaultValues: {
      projectName: "",
      description: "",
    },
  });

  const createShelfMutation = useMutation({
    mutationFn: async (data: CreateShelfForm) => {
      const response = await fetch("/api/shelves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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
        description: "Digital shelf created successfully",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const configPersonasMutation = useMutation({
    mutationFn: async ({ shelfId, personaIds }: { shelfId: number; personaIds: number[] }) => {
      const response = await fetch(`/api/shelves/${shelfId}/personas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personaIds }),
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
        description: "Personas configured successfully",
      });
      setConfigPersonasOpen(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const configProductsMutation = useMutation({
    mutationFn: async ({ shelfId, productIds }: { shelfId: number; productIds: number[] }) => {
      const response = await fetch(`/api/shelves/${shelfId}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds }),
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
        description: "Products configured successfully",
      });
      setConfigProductsOpen(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteShelfMutation = useMutation({
    mutationFn: async (shelfId: number) => {
      const response = await fetch(`/api/shelves/${shelfId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shelves"] });
      toast({
        title: "Success",
        description: "Digital shelf deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const conjointForm = useForm<ConjointConfigForm>({
    resolver: zodResolver(conjointConfigSchema),
    defaultValues: {
      priceLevels: 3,
    },
  });

  const configConjointMutation = useMutation({
    mutationFn: async ({ shelfId, priceLevels }: { shelfId: number; priceLevels: number }) => {
      const response = await fetch(`/api/shelves/${shelfId}/conjoint-configuration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceLevels }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save configuration' }));
        throw new Error(errorData.message || 'Failed to save configuration');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shelves"] });
      toast({
        title: "Success",
        description: "Conjoint configuration saved successfully",
      });
      setConfigConjointOpen(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingShelves || isLoadingPersonas || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Digital Shelf Setup</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Shelf
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Digital Shelf</DialogTitle>
              <DialogDescription>
                Set up a new digital shelf to manage your products and run simulations.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createShelfMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter project description"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createShelfMutation.isPending}
                >
                  {createShelfMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Digital Shelf
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Digital Shelves</CardTitle>
        </CardHeader>
        <CardContent>
          {shelves.length > 0 ? (
            <div className="divide-y">
              {shelves.map((shelf) => (
                <div key={shelf.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{shelf.projectName}</h3>
                    {shelf.description && (
                      <p className="text-sm text-muted-foreground mt-1">{shelf.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Dialog
                        open={configPersonasOpen === shelf.id}
                        onOpenChange={(open) => {
                          if (!open) setConfigPersonasOpen(null);
                          else {
                            setConfigPersonasOpen(shelf.id);
                            setSelectedPersonas(new Set(shelf.personas.map((p) => p.persona.id)));
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Users className="h-4 w-4 mr-2" />
                            Config Personas ({shelf.personas.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Configure Personas</DialogTitle>
                            <DialogDescription>
                              Select the personas to be tested in this shelf.
                            </DialogDescription>
                          </DialogHeader>
                          <Command>
                            <CommandInput placeholder="Search personas..." />
                            <CommandEmpty>No personas found.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-[300px]">
                                {personas.map((persona) => (
                                  <CommandItem
                                    key={persona.id}
                                    onSelect={() => {
                                      const newSelection = new Set(selectedPersonas);
                                      if (newSelection.has(persona.id)) {
                                        newSelection.delete(persona.id);
                                      } else {
                                        newSelection.add(persona.id);
                                      }
                                      setSelectedPersonas(newSelection);
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedPersonas.has(persona.id)}
                                      className="mr-2"
                                    />
                                    {persona.name}
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </Command>
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button variant="outline" onClick={() => setConfigPersonasOpen(null)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                configPersonasMutation.mutate({
                                  shelfId: shelf.id,
                                  personaIds: Array.from(selectedPersonas),
                                });
                              }}
                              disabled={configPersonasMutation.isPending}
                            >
                              {configPersonasMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                "Save Changes"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={configProductsOpen === shelf.id}
                        onOpenChange={(open) => {
                          if (!open) setConfigProductsOpen(null);
                          else {
                            setConfigProductsOpen(shelf.id);
                            setSelectedProducts(new Set(shelf.products.map((p) => p.product.id)));
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Package className="h-4 w-4 mr-2" />
                            Config Products ({shelf.products.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Configure Products</DialogTitle>
                            <DialogDescription>
                              Select the products to be tested in this shelf.
                            </DialogDescription>
                          </DialogHeader>
                          <Command>
                            <CommandInput placeholder="Search products..." />
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-[300px]">
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    onSelect={() => {
                                      const newSelection = new Set(selectedProducts);
                                      if (newSelection.has(product.id)) {
                                        newSelection.delete(product.id);
                                      } else {
                                        newSelection.add(product.id);
                                      }
                                      setSelectedProducts(newSelection);
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedProducts.has(product.id)}
                                      className="mr-2"
                                    />
                                    {product.productName}
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </Command>
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button variant="outline" onClick={() => setConfigProductsOpen(null)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                configProductsMutation.mutate({
                                  shelfId: shelf.id,
                                  productIds: Array.from(selectedProducts),
                                });
                              }}
                              disabled={configProductsMutation.isPending}
                            >
                              {configProductsMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                "Save Changes"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={configConjointOpen === shelf.id}
                        onOpenChange={(open) => {
                          if (!open) setConfigConjointOpen(null);
                          else {
                            setConfigConjointOpen(shelf.id);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings2 className="h-4 w-4 mr-2" />
                            Configure Conjoint
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Configure Conjoint Survey</DialogTitle>
                            <DialogDescription>
                              Set up the conjoint survey parameters for optimal product and price combinations.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...conjointForm}>
                            <form
                              onSubmit={conjointForm.handleSubmit((data) =>
                                configConjointMutation.mutate({
                                  shelfId: shelf.id,
                                  priceLevels: data.priceLevels,
                                })
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={conjointForm.control}
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
                                        <SelectItem value="3">3 (Low, Med, and High)</SelectItem>
                                        <SelectItem value="4">4 Levels</SelectItem>
                                        <SelectItem value="5">5 Levels</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="border rounded-lg p-4 bg-muted/50">
                                <h4 className="font-medium mb-2">Generated Combinations</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                  Based on {shelf.products.length} products with{" "}
                                  {conjointForm.watch("priceLevels")} price levels each:
                                </p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Total Combinations</TableHead>
                                      <TableHead>Estimated Time</TableHead>
                                      <TableHead>Minimum Sample Size</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow>
                                      <TableCell>
                                        {calculateShelfMetrics(shelf.products, conjointForm.watch("priceLevels")).totalCombinations}
                                      </TableCell>
                                      <TableCell>
                                        {`~${calculateShelfMetrics(shelf.products, conjointForm.watch("priceLevels")).estimatedTime} minutes`}
                                      </TableCell>
                                      <TableCell>
                                        {calculateShelfMetrics(shelf.products, conjointForm.watch("priceLevels")).minSampleSize}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setConfigConjointOpen(null)}
                                  type="button"
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={configConjointMutation.isPending}>
                                  {configConjointMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    "Save Configuration"
                                  )}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>Total Combinations: {calculateShelfMetrics(shelf.products).totalCombinations.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Min Sample Size: {calculateShelfMetrics(shelf.products).minSampleSize.toLocaleString()}</span>
                      </div>
                    </div>
                    {shelf.personas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {shelf.personas.map((p) => (
                          <div
                            key={p.persona.id}
                            className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            {p.persona.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {shelf.products.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Products on Shelf:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {shelf.products.map((p) => {
                            // Debug logging for product data
                            console.log('Product in shelf:', p);
                            console.log('Product images:', p.product.images);

                            // Get the first image URL safely
                            const imageUrl = p.product.images && p.product.images.length > 0
                              ? getImageUrl(p.product.images[0].url)
                              : null;


                            return (
                              <div key={p.product.id} className="border rounded-lg p-4 space-y-2">
                                <div className="relative w-full h-40 bg-muted">
                                  {p.product.newProduct === "yes" && (
                                    <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-full">
                                      New Product
                                    </div>
                                  )}
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={p.product.productName}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold truncate">{p.product.productName}</h3>
                                  <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                                    <p>{formatPrice(p.product.listPrice)}</p>
                                    {p.product.packSize && (
                                      <p>Pack: {p.product.packSize}</p>
                                    )}
                                    {p.product.volumeSize && (
                                      <p>Volume: {p.product.volumeSize}</p>
                                    )}
                                  </div>
                                  <ProductPriceConfig
                                    productId={p.product.id}
                                    productName={p.product.productName}
                                    listPrice={p.product.listPrice}
                                    currentLowPrice={p.product.lowPrice}
                                    currentHighPrice={p.product.highPrice}
                                    currentPriceLevels={p.product.priceLevels}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Digital Shelf</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this digital shelf? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteShelfMutation.mutate(shelf.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteShelfMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No digital shelves created yet. Create your first one using the "New Shelf" button above!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}