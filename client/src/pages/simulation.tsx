import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: number;
  brandName: string;
  productName: string;
  description: string;
  benefits: string[];
  listPrice: number;
  imageUrl?: string;
}

interface Persona {
  id: number;
  name: string;
  demandSpaces: string[];
}

interface SimulationResult {
  demandSpace: string;
  selectedProductId: number;
}

export default function SimulationPage() {
  const { toast } = useToast();
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);

  const { data: personas } = useQuery<Persona[]>({
    queryKey: ["/api/personas"]
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  const simulateMutation = useMutation({
    mutationFn: async ({ personaId, productIds }: { personaId: number, productIds: number[] }) => {
      const response = await fetch("/api/simulate-persona-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, productIds }),
      });
      if (!response.ok) {
        throw new Error("Failed to run simulation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSimulationResults(data);
      toast({
        title: "Simulation Complete",
        description: "The persona's preferences have been simulated across all demand spaces."
      });
    },
    onError: () => {
      toast({
        title: "Simulation Failed",
        description: "There was an error running the simulation.",
        variant: "destructive"
      });
    }
  });

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
    );
  };

  const handleSimulate = () => {
    if (!selectedPersona || selectedProducts.length === 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select a persona and at least one product.",
        variant: "destructive"
      });
      return;
    }

    simulateMutation.mutate({
      personaId: parseInt(selectedPersona),
      productIds: selectedProducts
    });
  };

  const selectedPersonaData = personas?.find(p => p.id === parseInt(selectedPersona));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Persona AI Simulation</h1>
        <Button
          onClick={handleSimulate}
          disabled={!selectedPersona || selectedProducts.length === 0 || simulateMutation.isPending}
        >
          {simulateMutation.isPending ? "Simulating..." : "Run Simulation"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Persona Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Persona</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPersona} onValueChange={setSelectedPersona}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a persona" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {personas?.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id.toString()}>
                    {persona.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md">
              <div className="space-y-4">
                {products?.map((product) => (
                  <div key={product.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => handleProductToggle(product.id)}
                    />
                    <Label htmlFor={`product-${product.id}`} className="text-sm">
                      {product.brandName} - {product.productName}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Results */}
      {selectedPersonaData && simulationResults.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Simulation Results</h2>
          {selectedPersonaData.demandSpaces.map((demandSpace) => {
            const result = simulationResults.find(r => r.demandSpace === demandSpace);
            return (
              <Card key={demandSpace}>
                <CardHeader>
                  <CardTitle>{demandSpace}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products?.filter(p => selectedProducts.includes(p.id)).map((product) => (
                      <div
                        key={product.id}
                        className={`relative p-4 rounded-lg border ${
                          result?.selectedProductId === product.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                          }`}
                      >
                        {result?.selectedProductId === product.id && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-full">
                            Selected
                          </div>
                        )}
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-full h-48 object-cover rounded-md mb-4"
                          />
                        )}
                        <h3 className="font-semibold">{product.brandName} - {product.productName}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
                        {product.benefits && product.benefits.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-semibold">Benefits:</p>
                            <ul className="list-disc list-inside text-sm">
                              {product.benefits.map((benefit, index) => (
                                <li key={index}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="mt-2 font-semibold">
                          Price: ${(product.listPrice / 100).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}