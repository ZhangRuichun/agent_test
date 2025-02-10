import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ImageOff, DollarSign, TrendingUp, Users, ShoppingCart } from "lucide-react";

interface SurveyRun {
  id: number;
  shelfId: number;
  projectName: string;
  date: string;
}

interface ProductAnalysis {
  productId: number;
  brandName: string;
  productName: string;
  description?: string;
  imageUrl?: string | null;
  responses: Record<string, number>;
  listPrice: number;
  lowPrice?: number;
  highPrice?: number;
}

interface AnalysisData {
  totalResponses: number;
  byRespondentType: Record<string, number>;
  byProduct: ProductAnalysis[];
}

export default function AnalysisPage() {
  const [selectedRun, setSelectedRun] = useState<string>();

  const { data: runs } = useQuery<SurveyRun[]>({
    queryKey: ["/api/survey-runs"],
  });

  const { data: analysis } = useQuery<AnalysisData>({
    queryKey: [`/api/survey-runs/${selectedRun}/analysis`],
    enabled: !!selectedRun,
  });

  // Transform data for the chart
  const chartData = analysis?.byProduct.map((product) => ({
    name: `${product.brandName} ${product.productName}`,
    SYNTHETIC: product.responses.SYNTHETIC || 0,
    HUMAN: product.responses.HUMAN || 0,
  }));

  // Function to calculate optimal price based on response distribution
  const calculateOptimalPrice = (product: ProductAnalysis): number => {
    if (!analysis) return product.listPrice;

    const totalResponses = Object.values(product.responses).reduce((a, b) => a + b, 0);
    if (totalResponses === 0) return product.listPrice;

    const responseProportion = totalResponses / analysis.totalResponses;
    const basePrice = product.listPrice;
    const lowPrice = product.lowPrice || Math.round(basePrice * 0.8);
    const highPrice = product.highPrice || Math.round(basePrice * 1.2);

    // If product has high preference, suggest a price closer to high price point
    // If product has low preference, suggest a price closer to low price point
    const optimalPrice = basePrice + (responseProportion > 0.5
      ? Math.round((highPrice - basePrice) * (responseProportion - 0.5) * 2)
      : Math.round((lowPrice - basePrice) * (1 - responseProportion * 2)));

    return optimalPrice;
  };

  // Calculate price elasticity of demand
  const calculatePriceElasticity = (product: ProductAnalysis): number => {
    if (!analysis) return 0;

    const totalResponses = Object.values(product.responses).reduce((a, b) => a + b, 0);
    const marketShare = totalResponses / analysis.totalResponses;
    const optimalPrice = calculateOptimalPrice(product);

    // Calculate % change in quantity and price
    const priceChange = ((optimalPrice - product.listPrice) / product.listPrice);
    const quantityChange = ((marketShare - 0.5) / 0.5); // Using 0.5 as baseline market share

    // Avoid division by zero
    if (priceChange === 0) return 0;

    // Price elasticity = % change in quantity / % change in price
    return Math.abs(quantityChange / priceChange);
  };

  // Calculate revenue forecast
  const calculateRevenueForecast = (product: ProductAnalysis): number => {
    if (!analysis) return 0;

    const totalResponses = Object.values(product.responses).reduce((a, b) => a + b, 0);
    const marketShare = totalResponses / analysis.totalResponses;
    const optimalPrice = calculateOptimalPrice(product);

    // Assume a baseline market size of 10,000 customers per month
    const baselineMarket = 10000;
    const projectedSales = baselineMarket * marketShare;

    return Math.round(projectedSales * optimalPrice);
  };

  // Generate product conclusion
  const generateConclusion = (product: ProductAnalysis): string => {
    if (!analysis) return "";

    const elasticity = calculatePriceElasticity(product);
    const totalResponses = Object.values(product.responses).reduce((a, b) => a + b, 0);
    const marketShare = totalResponses / analysis.totalResponses;
    const optimalPrice = calculateOptimalPrice(product);

    let conclusion = [];

    // Price sensitivity analysis
    if (elasticity < 1) {
      conclusion.push("Price insensitive: Consider premium positioning.");
    } else if (elasticity > 2) {
      conclusion.push("Highly price sensitive: Focus on cost optimization.");
    } else {
      conclusion.push("Moderate price sensitivity: Balance value and premium positioning.");
    }

    // Market performance
    if (marketShare > 0.4) {
      conclusion.push("Strong market performance with high preference share.");
    } else if (marketShare < 0.2) {
      conclusion.push("Limited market traction, consider product improvements or repositioning.");
    } else {
      conclusion.push("Moderate market acceptance with room for growth.");
    }

    // Price optimization
    const priceDiff = ((optimalPrice - product.listPrice) / product.listPrice) * 100;
    if (Math.abs(priceDiff) > 15) {
      conclusion.push(`Price adjustment of ${priceDiff.toFixed(1)}% recommended.`);
    }

    return conclusion.join(" ");
  };

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatRevenue(cents: number): string {
    // Remove $ since it's added by the UI
    return new Intl.NumberFormat('en-US').format(Math.round(cents / 100));
  }

  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Digital Shelf Analysis</h1>

      <div className="space-y-8">
        {/* Run Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Survey Run</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedRun} onValueChange={setSelectedRun}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a survey run" />
              </SelectTrigger>
              <SelectContent>
                {runs?.map((run) => (
                  <SelectItem key={run.id} value={run.id.toString()}>
                    {run.projectName} - {format(new Date(run.date), "PP")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {analysis && (
          <>
            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">{analysis.totalResponses}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Synthetic Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">{analysis.byRespondentType.SYNTHETIC || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Human Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">{analysis.byRespondentType.HUMAN || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Product Preferences by Respondent Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="SYNTHETIC" fill="hsl(var(--primary))" name="Synthetic" />
                      <Bar dataKey="HUMAN" fill="hsl(var(--secondary))" name="Human" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Product Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysis.byProduct.map((product) => (
                <Card key={product.productId} className="overflow-hidden">
                  {/* Product Image */}
                  <div className="aspect-[16/9] relative bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={`${product.brandName} ${product.productName}`}
                        className="object-contain w-full h-full"
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

                  <CardContent className="p-6">
                    {/* Product Header */}
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold">{product.brandName}</h3>
                      <p className="text-lg text-muted-foreground">{product.productName}</p>
                      {product.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Pricing Analysis */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Pricing Analysis
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Price</p>
                          <p className="text-lg font-medium">{formatPrice(product.listPrice)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Optimal Price</p>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(calculateOptimalPrice(product))}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Price Range</p>
                          <p className="text-lg">
                            {formatPrice(product.lowPrice || product.listPrice * 0.8)} - {formatPrice(product.highPrice || product.listPrice * 1.2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Market Performance */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Market Performance
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Market Share</p>
                          <p className="text-lg font-medium">
                            {formatPercentage((Object.values(product.responses).reduce((a, b) => a + b, 0) / analysis.totalResponses) * 100)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Price Elasticity</p>
                          <p className="text-lg font-medium">{calculatePriceElasticity(product).toFixed(2)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Response Distribution</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span>Synthetic</span>
                            <span className="font-medium">{product.responses.SYNTHETIC || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Human</span>
                            <span className="font-medium">{product.responses.HUMAN || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Revenue Forecast */}
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Revenue Forecast
                      </h4>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <p className="text-2xl font-bold">{formatRevenue(calculateRevenueForecast(product))}</p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                    </div>

                    {/* Analysis Insights */}
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <p className="text-sm leading-relaxed">{generateConclusion(product)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}