import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, Edit2, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

const personaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  demographicScreener: z.string().min(1, "Demographic screener is required"),
  demandSpaces: z.array(z.string().min(1, "Demand space description is required")),
});

type FormData = z.infer<typeof personaSchema>;

type Question = {
  id: number;
  question: string;
  answerType: 'SINGLE' | 'MULTIPLE' | 'NUMBER' | 'TEXT';
  options?: string[];
};

type Demographics = {
  [key: string]: string | number | string[];
};

type GeneratedResponse = {
  demographics: Demographics;
  questions: Question[];
};

type Persona = {
  id: number;
  name: string;
  demographicScreener: string;
  demandSpaces: string[];
  demographics: Demographics;
  questions: Question[];
};

const formatDemographics = (demographics: Demographics, questions: Question[]) => {
  const formattedEntries = Object.entries(demographics).map(([id, value]) => {
    const question = questions.find(q => q.id === parseInt(id));
    if (!question) return null;

    let formattedValue = Array.isArray(value) ? value.join(", ") : value;
    return `${question.question}: ${formattedValue}`;
  }).filter(Boolean);

  return formattedEntries.join("\n");
};

export default function PersonasPage() {
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [deletingPersonaId, setDeletingPersonaId] = useState<number | null>(null);
  const [demandSpaces, setDemandSpaces] = useState<string[]>([""]);
  const [generatedDemographics, setGeneratedDemographics] = useState<GeneratedResponse | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentScreener, setCurrentScreener] = useState("");
  const debouncedScreener = useDebounce(currentScreener, 1000); // Changed from 2000 to 1000

  useEffect(() => {
    if (debouncedScreener) {
      fetch("/api/personas/generate-demographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: debouncedScreener }),
        credentials: "include",
      }).then(async (res) => {
        if (res.ok) {
          const responseData = await res.json();
          setGeneratedDemographics(responseData);
        }
      });
    }
  }, [debouncedScreener]);

  const form = useForm<FormData>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      name: "",
      demographicScreener: "",
      demandSpaces: [""],
    },
  });

  const { data: personas, isLoading } = useQuery<Persona[]>({
    queryKey: ["/api/personas"],
  });

  const createPersona = useMutation({
    mutationFn: async (data: FormData) => {
      if (!generatedDemographics) {
        throw new Error("Please enter a demographic screener first");
      }

      const createResponse = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          demographicScreener: data.demographicScreener,
          demographics: generatedDemographics.demographics,
          questions: generatedDemographics.questions,
          demandSpaces: data.demandSpaces.filter(space => space.trim() !== ""),
        }),
        credentials: "include",
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(errorText);
      }

      return createResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      setIsAddPanelOpen(false);
      form.reset();
      setDemandSpaces([""]);
      setGeneratedDemographics(null);
      setCurrentScreener("");
      toast({
        title: "Success",
        description: "Persona created successfully",
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

  const updatePersona = useMutation({
    mutationFn: async (data: FormData & { id: number }) => {
      const response = await fetch(`/api/personas/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          demographicScreener: data.demographicScreener,
          demandSpaces: data.demandSpaces.filter(space => space.trim() !== ""),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      setEditingPersona(null);
      form.reset();
      toast({
        title: "Success",
        description: "Persona updated successfully",
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

  const deletePersona = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/personas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'DELETED' }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      setDeletingPersonaId(null);
      toast({
        title: "Success",
        description: "Persona deleted successfully",
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

  const onSubmit = (data: FormData) => {
    if (editingPersona) {
      updatePersona.mutate({ ...data, id: editingPersona.id });
    } else {
      createPersona.mutate(data);
    }
  };

  const addDemandSpace = () => {
    setDemandSpaces([...demandSpaces, ""]);
  };

  const removeDemandSpace = (index: number) => {
    setDemandSpaces(demandSpaces.filter((_, i) => i !== index));
  };

  const updateDemandSpace = (index: number, value: string) => {
    const newDemandSpaces = [...demandSpaces];
    newDemandSpaces[index] = value;
    setDemandSpaces(newDemandSpaces);
    form.setValue("demandSpaces", newDemandSpaces);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Personas</h1>
          <p className="text-muted-foreground">
            Manage consumer personas for simulation
          </p>
        </div>
        <div>
          <Dialog open={isAddPanelOpen || !!editingPersona}
            onOpenChange={(open) => {
              if (!open) {
                setIsAddPanelOpen(false);
                setEditingPersona(null);
                form.reset();
                setDemandSpaces([""]);
                setGeneratedDemographics(null);
                setCurrentScreener("");
              }
            }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddPanelOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Persona
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPersona ? 'Edit' : 'Create'} Persona</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Urban Millennial" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demographicScreener"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Demographic Screener</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="e.g., Teenage urban males"
                            onChange={(e) => {
                              field.onChange(e);
                              setCurrentScreener(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {generatedDemographics && (
                    <div className="rounded-md bg-muted p-4">
                      <p className="text-sm font-medium mb-2">Generated Demographics:</p>
                      <pre className="text-sm whitespace-pre-wrap">
                        {formatDemographics(generatedDemographics.demographics, generatedDemographics.questions)}
                      </pre>
                    </div>
                  )}
                  <div className="space-y-4">
                    <FormLabel>Demand Spaces</FormLabel>
                    {demandSpaces.map((space, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={space}
                          onChange={(e) => updateDemandSpace(index, e.target.value)}
                          placeholder="Describe the demand space..."
                          className="flex-1"
                        />
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDemandSpace(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addDemandSpace}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Demand Space
                    </Button>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingPersona ? 'Update' : 'Create'} Persona
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Demographics</TableHead>
                <TableHead>Demand Spaces</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personas?.map((persona) => (
                <TableRow key={persona.id}>
                  <TableCell className="font-medium">{persona.name}</TableCell>
                  <TableCell>{persona.demographicScreener}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {persona.demandSpaces.map((space: string) => (
                        <Badge key={space} variant="secondary">
                          {space}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPersona(persona);
                          form.reset({
                            name: persona.name,
                            demographicScreener: persona.demographicScreener,
                            demandSpaces: persona.demandSpaces,
                          });
                          setDemandSpaces(persona.demandSpaces);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog open={deletingPersonaId === persona.id} onOpenChange={(open) => !open && setDeletingPersonaId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingPersonaId(persona.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Persona</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this persona? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePersona.mutate(persona.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!personas || personas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No personas created yet. Add your first one above!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}