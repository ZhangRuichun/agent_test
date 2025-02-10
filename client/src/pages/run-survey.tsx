import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Copy, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { ProductAnalysis, SimulationResult } from "@/lib/types";

interface Shelf {
  id: number;
  projectName: string;
}

interface SimulationDetail {
  id: number;
  timestamp: string;
  persona: {
    name: string;
    demographics: Record<string, any>;
    demandSpaces: string[];
  } | null;
  selectedProduct: {
    id: number;
    brandName: string;
    productName: string;
  };
  productLineup: Array<{
    productId: number;
    price: number;
  }>;
}

const surveyConfigSchema = z.object({
  shelfId: z.string(),
  runName: z.string().min(1, "Run name is required"),
});

type SurveyConfigForm = z.infer<typeof surveyConfigSchema>;

function generateDefaultRunName(): string {
  const now = new Date();
  return `Survey Run ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

export default function RunSurveyPage() {
  const { toast } = useToast();
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const { data: shelves } = useQuery<Shelf[]>({
    queryKey: ["/api/shelves"],
  });

  const { data: simulationDetails } = useQuery<SimulationDetail[]>({
    queryKey: [`/api/survey-runs/${selectedVariantId}/details`],
    enabled: !!selectedVariantId,
  });

  const form = useForm<SurveyConfigForm>({
    resolver: zodResolver(surveyConfigSchema),
    defaultValues: {
      runName: generateDefaultRunName(),
    },
  });

  const runSimulation = useMutation({
    mutationFn: async (data: SurveyConfigForm) => {
      setSimulationResult(null);
      setSelectedVariantId(null);

      const response = await fetch(`/api/shelves/${data.shelfId}/run-survey`, {
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

      return await response.json() as SimulationResult;
    },
    onSuccess: (data: SimulationResult) => {
      setSimulationResult(data);
      toast({
        title: "Success",
        description: "AI Simulation completed successfully. You can now review the results.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleCopyUrl = async () => {
    if (!simulationResult?.surveyUrl) return;

    try {
      await navigator.clipboard.writeText(window.location.origin + simulationResult.surveyUrl);
      toast({
        title: "Success",
        description: "Survey URL copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy URL to clipboard",
      });
    }
  };

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Run Digital Shelf Survey</h1>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>New Survey Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => runSimulation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="shelfId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Shelf</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a digital shelf" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shelves?.map((shelf) => (
                            <SelectItem key={shelf.id} value={shelf.id.toString()}>
                              {shelf.projectName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="runName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Run Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={async () => {
                      const shelfId = form.getValues("shelfId");
                      if (shelfId) {
                        try {
                          const response = await fetch(`/api/shelves/${shelfId}/create-survey`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            credentials: "include",
                          });

                          if (!response.ok) {
                            throw new Error(await response.text());
                          }

                          const { surveyId } = await response.json();
                          window.open(`/survey/${surveyId}`, '_blank');
                          toast({
                            title: "Survey Preview",
                            description: "Preview survey opened in a new tab",
                          });
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to create preview survey",
                          });
                        }
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Please select a digital shelf first",
                        });
                      }
                    }}
                  >
                    Preview Survey
                  </Button>

                  <Button type="submit" className="w-full" disabled={runSimulation.isPending}>
                    {runSimulation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing AI Simulation...
                      </>
                    ) : (
                      "Run AI Simulation"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {runSimulation.isPending && (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p className="text-lg">Processing AI Simulation...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {simulationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {simulationResult.products.slice(0, 6).map((product, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="aspect-video relative bg-muted">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageOff className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="hidden absolute inset-0 flex items-center justify-center">
                        <ImageOff className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold mb-1">{product.brand}</h3>
                      <h4 className="text-base mb-2">{product.name}</h4>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Optimal Price</p>
                          <p className="text-lg font-bold">${product.optimalPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Preference Share</p>
                          <p className="text-lg font-bold">{(product.preferenceShare * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8 space-y-2">
                <p className="text-sm font-medium">Survey URL</p>
                <div className="flex gap-2">
                  <a
                    href={simulationResult.surveyUrl}
                    className="flex-1 px-3 py-2 border rounded-md hover:bg-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {simulationResult.surveyUrl}
                  </a>
                  <Button type="button" onClick={handleCopyUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" onClick={() => setSelectedVariantId(simulationResult.variantId)}>
                      View Detailed Results
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Detailed Simulation Results</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Persona</TableHead>
                            <TableHead>Product Lineup</TableHead>
                            <TableHead>Selected Product</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {simulationDetails?.map((detail) => (
                            <TableRow key={detail.id}>
                              <TableCell>
                                {format(new Date(detail.timestamp), "PPp")}
                              </TableCell>
                              <TableCell>
                                {detail.persona?.name || "Anonymous"}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  {detail.productLineup.map((item) => (
                                    <div key={item.productId} className="text-sm">
                                      {simulationResult.products.find((p) => p.id === item.productId)
                                        ?.name || `Product ${item.productId}`}{" "}
                                      {formatPrice(item.price)}
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                {detail.selectedProduct.brandName} {detail.selectedProduct.productName}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}