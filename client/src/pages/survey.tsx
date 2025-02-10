import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ProductVariant {
  id: string;
  productId: number;
  brandName: string;
  productName: string;
  description: string;
  benefits: string[];
  imageUrl: string | null;
  price: number;
  formattedPrice: string;
}

interface ProductCombination {
  id: number;
  options: ProductVariant[];
}

interface DemographicQuestion {
  id: string;
  question: string;
  type: "SINGLE" | "MULTIPLE" | "NUMBER" | "TEXT";
  options?: string[];
}

interface SurveyState {
  currentStep: number;
  answers: Record<string, any>;
  productSelections: string[]; // Store selected variant IDs
}

export default function SurveyPage() {
  const { toast } = useToast();
  const [state, setState] = useState<SurveyState>({
    currentStep: 0,
    answers: {},
    productSelections: [],
  });

  // Get survey ID from URL
  const surveyId = window.location.pathname.split("/").pop();

  const { data: survey, isLoading } = useQuery<{
    questions: DemographicQuestion[];
    productCombinations: ProductCombination[];
  }>({
    queryKey: [`/api/survey/${surveyId}`],
    enabled: !!surveyId,
  });

  const totalSteps = (survey?.questions?.length || 0) + (survey?.productCombinations?.length || 0);
  const progress = (state.currentStep / totalSteps) * 100;

  const handleAnswer = (questionId: string, answer: any) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
      currentStep: prev.currentStep + 1,
    }));
  };

  const handleProductSelect = async (variantId: string | null) => {
    const newSelections = [...state.productSelections, variantId];
    setState((prev) => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      productSelections: newSelections,
    }));

    if (state.currentStep === totalSteps - 1) {
      try {
        const response = await fetch(`/api/survey/${surveyId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            demographics: state.answers,
            selections: newSelections,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        toast({
          title: "Thank you!",
          description: "Your survey responses have been recorded.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to submit survey",
        });
      }
    }
  };

  if (isLoading || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading survey...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = state.currentStep < survey.questions.length
    ? survey.questions[state.currentStep]
    : null;

  const currentCombination = state.currentStep >= survey.questions.length
    ? survey.productCombinations[state.currentStep - survey.questions.length]
    : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Digital Shelf Survey</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4"/>

            {currentQuestion && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{currentQuestion.question}</h3>
                {currentQuestion.type === "SINGLE" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => (
                      <Button
                        key={option}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
                {currentQuestion.type === "MULTIPLE" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => (
                      <Button
                        key={option}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          const currentAnswers = state.answers[currentQuestion.id] || [];
                          const newAnswers = currentAnswers.includes(option)
                            ? currentAnswers.filter((a: string) => a !== option)
                            : [...currentAnswers, option];
                          handleAnswer(currentQuestion.id, newAnswers);
                        }}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
                {(currentQuestion.type === "TEXT" || currentQuestion.type === "NUMBER") && (
                  <div className="space-y-4">
                    <Input
                      type={currentQuestion.type === "NUMBER" ? "number" : "text"}
                      placeholder={`Enter your ${currentQuestion.type.toLowerCase()}`}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const input = e.target as HTMLInputElement;
                          handleAnswer(currentQuestion.id, input.value);
                        }
                      }}
                    />
                    <Button
                      className="w-full"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        handleAnswer(currentQuestion.id, input.value);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {currentCombination && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">
                  Which product would you prefer to purchase?
                </h3>
                <div className={cn(
                  "grid gap-4",
                  currentCombination.options.length <= 2 ? "grid-cols-1 md:grid-cols-2" :
                  currentCombination.options.length <= 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
                  currentCombination.options.length <= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
                  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {currentCombination.options.map((variant) => (
                    <HoverCard key={variant.id}>
                      <HoverCardTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-auto p-4 flex flex-col items-center gap-4 hover:bg-accent"
                          onClick={() => handleProductSelect(variant.id)}
                        >
                          {variant.imageUrl ? (
                            <div className="w-full aspect-square relative">
                              <img
                                src={variant.imageUrl}
                                alt={variant.productName}
                                className="absolute inset-0 w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <span className="text-muted-foreground">No image</span>
                            </div>
                          )}
                          <div className="text-center space-y-2">
                            <div className="font-semibold">{variant.brandName}</div>
                            <div>{variant.productName}</div>
                            <div className="text-2xl font-bold text-primary">
                              {variant.formattedPrice}
                            </div>
                          </div>
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{variant.productName}</h4>
                          <p className="text-sm">{variant.description}</p>
                          {variant.benefits.length > 0 && (
                            <div>
                              <h5 className="font-medium mt-2">Benefits:</h5>
                              <ul className="list-disc list-inside text-sm">
                                {variant.benefits.map((benefit, index) => (
                                  <li key={index}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>

                <div className="flex justify-center mt-6">
                  <Button
                    variant="secondary"
                    className="w-full max-w-md"
                    onClick={() => handleProductSelect(null)}
                  >
                    I don't like any of these options
                  </Button>
                </div>
              </div>
            )}

            {state.currentStep === totalSteps && (
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Thank You!</h3>
                <p>Your responses have been recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}