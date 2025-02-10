import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Upload,
  Wand2,
  X,
  Edit,
  Trash2,
  Search,
  SlidersHorizontal,
  Package,
  Shirt,
  Footprints,
  Watch,
  Camera,
} from "lucide-react";
import { ImageEditor } from "@/components/ui/image-editor";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const createProductSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  listPrice: z.number().min(0, "Price must be non-negative"),
  cost: z.number().min(0, "Cost must be non-negative"),
  packSize: z.string().optional(),
  volumeSize: z.string().optional(),
  newProduct: z.enum(["yes", "no"]).default("yes"),
});

interface Product {
  id: number;
  brandName: string;
  productName: string;
  description: string;
  listPrice: number;
  cost?: number;
  lowPrice?: number;
  highPrice?: number;
  benefits?: string;
  packSize?: string;
  volumeSize?: string;
  images?: { id: number; url: string }[];
  newProduct?: string;
}

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: z.infer<typeof createProductSchema>) => void;
  onGenerateImage: (product: Product) => void;
  onImageUpload: (
    productId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

function EditProductDialog({
  product,
  open,
  onClose,
  onSave,
  onGenerateImage,
  onImageUpload,
}: EditProductDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | undefined>(
    product?.images?.[0]?.url
  );

  const form = useForm<z.infer<typeof createProductSchema>>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      brandName: "",
      productName: "",
      description: "",
      listPrice: 0,
      cost: 0,
      packSize: "",
      volumeSize: "",
      newProduct: "yes",
    },
  });

  useEffect(() => {
    if (product) {
      // Only set values if we're editing an existing product
      form.reset({
        brandName: product.brandName,
        productName: product.productName,
        description: product.description,
        listPrice: product.listPrice,
        cost: product.cost || 0,
        packSize: product.packSize || "",
        volumeSize: product.volumeSize || "",
        newProduct: (product.newProduct as "yes" | "no") || "yes",
      });
      setPreviewImage(product.images?.[0]?.url);
    } else {
      // Reset to empty values for new product
      form.reset({
        brandName: "",
        productName: "",
        description: "",
        listPrice: 0,
        cost: 0,
        packSize: "",
        volumeSize: "",
        newProduct: "yes",
      });
      setPreviewImage(undefined);
    }
  }, [product, form]);

  // Add a handler for form submission
  const handleSubmit = async (data: z.infer<typeof createProductSchema>) => {
    setIsSaving(true);
    try {
      await onSave(data);
    } finally {
      setIsSaving(false);
    }
  };

  // Update the preview image when a new image is uploaded
  const handleImageUploadWithPreview = async (
    productId: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a temporary preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      // Call the original upload handler
      await onImageUpload(productId, event);

      // Clean up the temporary URL
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="w-full max-w-[90vw] md:max-w-[80vw] lg:max-w-[1000px] p-0 gap-0 h-[90vh] md:h-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full md:max-h-[80vh] overflow-hidden">
          {/* Left side - Form */}
          <div className="p-6 border-b md:border-b-0 md:border-r overflow-y-auto">
            <DialogHeader>
              <DialogTitle>General information</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4 mt-4"
              >
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter brand name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
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
                          placeholder="Enter product description"
                          className="resize-none h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="listPrice"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>List Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={value}
                            onChange={(e) =>
                              onChange(parseFloat(e.target.value) || 0)
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Cost ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={value}
                            onChange={(e) =>
                              onChange(parseFloat(e.target.value) || 0)
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="packSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pack Size</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 6 count"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="volumeSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume Size</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 500ml"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="newProduct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">New Product</SelectItem>
                          <SelectItem value="no">
                            Existing Inventory
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>

          {/* Right side - Preview */}
          <div className="p-6 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Preview</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="rounded-lg border p-4">
                <div className="relative aspect-[4/3] mb-4">
                  {previewImage ? (
                    <img
                      src={getImageUrl(previewImage)}
                      alt={form.watch("productName")}
                      className="rounded-lg object-contain w-full h-full"
                      onError={(e) => {
                        console.warn(
                          "Image load failed:",
                          previewImage
                        );
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "/assets/placeholder-product.png";
                        target.className =
                          "rounded-lg object-contain w-full h-full opacity-50";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Image controls */}
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                      onClick={() => product && onGenerateImage(product)}
                      disabled={isSaving}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                    <label
                      htmlFor={`image-upload-${product?.id || "new"}`}
                      className={`cursor-pointer ${isSaving ? 'opacity-50' : ''}`}
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white"
                        type="button"
                        asChild
                        disabled={isSaving}
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </span>
                      </Button>
                      <input
                        id={`image-upload-${product?.id || "new"}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          product && handleImageUploadWithPreview(product.id, e)
                        }
                        disabled={isSaving}
                      />
                    </label>
                  </div>
                </div>
                <h3 className="text-xl font-semibold">
                  {form.watch("productName") || "Product Name"}
                </h3>
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    {form.watch("description") || "Product description"}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xl font-bold">
                      ${form.watch("listPrice")?.toFixed(2) || "0.00"}
                    </span>
                    {form.watch("packSize") && (
                      <Badge variant="secondary">
                        Pack: {form.watch("packSize")}
                      </Badge>
                    )}
                    {form.watch("volumeSize") && (
                      <Badge variant="secondary">
                        Volume: {form.watch("volumeSize")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getImageUrl(url: string): string {
  if (!url) {
    return "/assets/placeholder-product.png";
  }

  // Handle both absolute and relative paths
  if (url.startsWith("http")) {
    return url;
  }

  // Remove any double slashes and ensure proper path
  const cleanUrl = url.replace(/\/+/g, "/");
  return cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
}

export default function ProductManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<
    "dall-e" | "flux" | "imagen3"
  >("dall-e");
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [currentGenerateAction, setCurrentGenerateAction] = useState<{
    type: "product" | "image";
    productId?: number;
    formData?: { brandName: string; prompt: string };
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    productId: number;
    imageId: number;
    url: string;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [addingProducts, setAddingProducts] = useState<Record<number, boolean>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [generatedProducts, setGeneratedProducts] = useState<
    GeneratedProduct[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<
    string | null
  >(null);
  const [generatingIndex, setGeneratingIndex] = useState<number>(0);

  const form = useForm<z.infer<typeof createProductSchema>>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      brandName: "",
      productName: "",
      description: "",
      listPrice: 0,
      cost: 0,
      packSize: "",
      volumeSize: "",
      newProduct: "yes",
    },
  });

  const generateForm = useForm({
    defaultValues: {
      brandName: "",
      prompt: "",
    },
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products"],
  });

  const createOrUpdateProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createProductSchema>) => {
      const url = selectedProduct
        ? `/api/products/${selectedProduct}`
        : "/api/products";
      const method = selectedProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const text = await response.text();
      let json;

      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse response: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(json.message || "Failed to save product");
      }

      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: selectedProduct
          ? "Product updated successfully"
          : "Product created successfully",
      });
      form.reset();
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({
      productId,
      file,
    }: {
      productId: number;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/products/${productId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async ({
      productId,
      prompt,
      model,
    }: {
      productId: number;
      prompt: string;
      model: "dall-e" | "flux" | "imagen3";
    }) => {
      try {
        const response = await fetch(`/api/generate-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brandName: "temp",
            prompt: prompt,
            model: model,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const generatedData = await response.json();
        if (!generatedData[0]?.imageUrl) {
          throw new Error("Failed to generate image");
        }

        const downloadResponse = await fetch(
          `/api/products/${productId}/download-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: generatedData[0].imageUrl,
            }),
            credentials: "include",
          },
        );

        if (!downloadResponse.ok) {
          throw new Error(await downloadResponse.text());
        }

        return downloadResponse.json();
      } catch (error) {
        console.error("Error generating image:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Image generated and saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({
      productId,
      imageId,
    }: {
      productId: number;
      imageId: number;
    }) => {
      const response = await fetch(
        `/api/products/${productId}/images/${imageId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setEditDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    setProductToDelete(productId);
    setDeleteConfirmOpen(true);
  };

  const handleImageUpload = async (
    productId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadImageMutation.mutate({ productId, file });
  };

  const handleGenerateClick = (
    type: "product" | "image",
    data?: {
      productId?: number;
      formData?: { brandName: string; prompt: string };
    },
  ) => {
    setCurrentGenerateAction({ type, ...data });
    setModelDialogOpen(true);
  };

  const handleModelSelect = async () => {
    if (!currentGenerateAction) return;

    if (
      currentGenerateAction.type === "image" &&
      currentGenerateAction.productId
    ) {
      const product = products.find(
        (p) => p.id === currentGenerateAction.productId,
      );
      if (!product) return;

      setIsGenerating(true);
      setGeneratingIndex(0);
      setGeneratedImages([]);

      toast({
        title: "Generating Images",
        description: `Creating variations using ${selectedModel}. This may take a few minutes...`,
        duration: 10000,
      });

      try {
        for (let i = 0; i < 4; i++) {
          setGeneratingIndex(i);
          const response = await fetch(`/api/generate-products`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              brandName: product.brandName,
              prompt: `Generate a high-quality, professional product photo of ${product.productName} by ${product.brandName}. 
                      Product details:
                      - Brand Name: ${product.brandName}
                      - Product Name: ${product.productName}
                      - Description: ${product.description}
                      ${product.packSize ? `- Pack Size: ${product.packSize}` : ''}
                      ${product.volumeSize ? `- Volume Size: ${product.volumeSize}` : ''}

                      The product should be presented on a clean, pure white (#FFFFFF) background with no other objects or shadows. 
                      Ensure the ${product.brandName} brand name is clearly and prominently displayed on the product itself. 
                      The image must be visually appealing and suitable for a customer survey.

                      Style considerations:
                      1. Lighting: Bright, even, and soft lighting to avoid harsh shadows
                      2. Angle: Show the product from a flattering and informative angle, typically a three-quarter view
                      3. Resolution: High resolution for detail clarity
                      4. Focus: Sharp focus on the entire product
                      5. Realism: The product should look photorealistic
                      6. Make sure the spelling of the brand name and product name is accurate
                      7. Important: This image is for a conjoint survey, so the product must be the sole focus against a pure white background`,
              model: selectedModel,
            }),
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const generatedData = await response.json();
          if (!generatedData[0]?.imageUrl) {
            throw new Error("Failed to generate image");
          }

          setGeneratedImages((prev) => [...prev, generatedData[0].imageUrl]);

          // Show progress toast
          toast({
            title: `Generated Image ${i + 1}/4`,
            description: "Keep generating remaining variations...",
          });
        }

        toast({
          title: "Success",
          description:
            "All images generated successfully! Please select your preferred variation.",
        });
      } catch (error) {
        console.error("Error generating image:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to generate images",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
        setGeneratingIndex(-1);
      }
    }
  };

  const handleGenerateProducts = (data: {
    brandName: string;
    prompt: string;
  }) => {
    handleGenerateClick("product", { formData: data });
  };

  const handleGenerateImage = (product: Product) => {
    handleGenerateClick("image", { productId: product.id });
  };

  const handleAddGeneratedProduct = async (
    product: GeneratedProduct,
    index: number,
  ) => {
    try {
      setAddingProducts((prev) => ({ ...prev, [index]: true }));

      const createdProduct = await createOrUpdateProductMutation.mutateAsync({
        brandName: product.brandName,
        productName: product.productName,
        description: product.description,
        listPrice: Number(product.listPrice),
        cost: Number(product.cost || 0),
        newProduct: "yes",
      });

      if (product.imageUrl) {
        try {
          const response = await fetch(
            `/api/products/${createdProduct.id}/download-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ imageUrl: product.imageUrl }),
              credentials: "include",
            },
          );

          if (!response.ok) {
            throw new Error(await response.text());
          }
        } catch (imageError) {
          console.error("Failed to download image:", imageError);
          toast({
            title: "Product Added",
            description:
              "Product was created but the image couldn't be downloaded. You can upload an image manually.",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Generated product added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to add generated product",
        variant: "destructive",
      });
    } finally {
      setAddingProducts((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleDeleteImage = async (productId: number, imageId: number) => {
    deleteImageMutation.mutate({ productId, imageId });
  };

  const handleImageClick = async (
    productId: number,
    imageId: number,
    imageUrl: string,
  ) => {
    try {
      const formattedUrl = imageUrl.startsWith("http")
        ? imageUrl
        : imageUrl.startsWith("/")
          ? `${window.location.origin}${imageUrl}`
          : `${window.location.origin}/${imageUrl}`;

      // Verify image exists before opening editor
      const response = await fetch(formattedUrl, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(`Image not found: ${formattedUrl}`);
      }

      setSelectedImage({ productId, imageId, url: formattedUrl });
    } catch (error) {
      console.error("Failed to load image:", error);
      toast({
        title: "Error",
        description:
          "Failed to load image. Please try uploading the image again.",
        variant: "destructive",
      });
    }
  };

  const handleImageSave = async (newImageUrl: string) => {
    if (!selectedImage) return;

    // Store old product data for rollback
    const oldProducts = queryClient.getQueryData<Product[]>(["/api/products"]);

    try {
      // 1. Download the new image first
      const downloadResponse = await fetch(
        `/api/products/${selectedImage.productId}/download-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: newImageUrl }),
          credentials: "include",
        }
      );

      if (!downloadResponse.ok) {
        throw new Error(await downloadResponse.text());
      }

      const result = await downloadResponse.json();

      // 2. Optimistically update the UI with new image
      queryClient.setQueryData<Product[]>(["/api/products"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((product) => {
          if (product.id === selectedImage.productId) {
            return {
              ...product,
              images: [{ id: selectedImage.imageId, url: result.imageUrl }],
            };
          }
          return product;
        });
      });

      // 3. Delete old image last
      await deleteImageMutation.mutateAsync({
        productId: selectedImage.productId,
        imageId: selectedImage.imageId,
      });

      // 4. Final refresh of data
      await queryClient.invalidateQueries({ queryKey: ["/api/products"] });

    } catch (error) {
      console.error('Image save error:', error);

      // Revert to old data on error
      if (oldProducts) {
        queryClient.setQueryData(["/api/products"], oldProducts);
      }

      throw error; // Re-throw to trigger error handling in ImageEditor
    }
  };

  const handleSaveEdit = async (data: z.infer<typeof createProductSchema>) => {
    if (!productToEdit) return;

    try {
      const response = await fetch(`/api/products/${productToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          newProduct: data.newProduct as "yes" | "no",
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditDialogOpen(false);
      setProductToEdit(null);
    } catch (error) {
      console.error("Failed to update product:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brandName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "all" || true;

    return matchesSearch && matchesCategory;
  });

  const GeneratedImagesDialog = () => {
    const [isSaving, setIsSaving] = useState(false);
    return (
      <Dialog
        open={modelDialogOpen && generatedImages.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setModelDialogOpen(false);
            setGeneratedImages([]);
            setSelectedGeneratedImage(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-[90vw] md:max-w-[80vw] lg:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle>
              {isGenerating
                ? `Generating Images (${generatedImages.length}/4)`
                : "Select Generated Image"}
            </DialogTitle>
            <DialogDescription>
              {isGenerating
                ? "Please wait while we generate all variations..."
                : "Choose one of the generated variations below"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 p-4">
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className={`relative cursor-pointer group ${
                  selectedGeneratedImage === generatedImages[idx]
                    ? "ring-2 ring-primary"
                    : ""
                } ${!generatedImages[idx] ? "opacity-50" : ""}`}
                onClick={() =>
                  generatedImages[idx] &&
                  setSelectedGeneratedImage(generatedImages[idx])
                }
              >
                {generatedImages[idx] ? (
                  <img
                    src={generatedImages[idx]}
                    alt={`Variation ${idx + 1}`}
                    className="w-full h-full object-contain rounded border aspect-square transition-transform group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full aspect-square bg-secondary rounded border flex items-center justify-center">
                    {generatingIndex === idx ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />{" "}
                        <span className="text-sm">Generating...</span>
                      </div>
                    ) : generatingIndex < idx ? (
                      <span className="text-sm text-muted-foreground">
                        Waiting...
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Failed to generate
                      </span>
                    )}
                  </div>
                )}
                {generatedImages[idx] && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      Click to select
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      Variation {idx + 1}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModelDialogOpen(false);
                setGeneratedImages([]);
                setSelectedGeneratedImage(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (
                  !selectedGeneratedImage ||
                  !currentGenerateAction?.productId
                )
                  return;

                setIsSaving(true);
                try {
                  const downloadResponse = await fetch(
                    `/api/products/${currentGenerateAction.productId}/download-image`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        imageUrl: selectedGeneratedImage,
                      }),
                      credentials: "include",
                    },
                  );

                  if (!downloadResponse.ok) {
                    throw new Error(await downloadResponse.text());
                  }

                  queryClient.invalidateQueries({
                    queryKey: ["/api/products"],
                  });
                  toast({
                    title: "Success",
                    description: "Image saved successfully",
                  });
                  setModelDialogOpen(false);
                  setGeneratedImages([]);
                  setSelectedGeneratedImage(null);
                } catch (error) {
                  toast({
                    title: "Error",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Failed to save image",
                    variant: "destructive",
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={!selectedGeneratedImage || isGenerating || isSaving}
            >
              {isGenerating ? (
                "Generating..."
              ) : isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Selected Image"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      {/* Model Selection Dialog */}
      <Dialog
        open={modelDialogOpen && generatedImages.length === 0}
        onOpenChange={(open) => {
          if (!open) {
            setModelDialogOpen(false);
            setGeneratedImages([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select AI Model</DialogTitle>
            <DialogDescription>
              Choose which AI model to use for image generation
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              value={selectedModel}
              onValueChange={(value) =>
                setSelectedModel(value as "dall-e" | "flux" | "imagen3")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dall-e">DALL-E</SelectItem>
                <SelectItem value="flux">Flux</SelectItem>
                <SelectItem value="imagen3">Imagen 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModelSelect} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Images Dialog */}
      <GeneratedImagesDialog />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setProductToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                productToDelete && deleteProductMutation.mutate(productToDelete)
              }
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="container mx-auto py-10">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-8">
          <h1 className="text-4xl font-bold">Products</h1>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                className="pl-10 w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Product Ideas
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Generate Product Ideas</DialogTitle>
                  <DialogDescription>
                    Enter a brand name and describe what kind of products you
                    want to generate.
                  </DialogDescription>
                </DialogHeader>
                <Form {...generateForm}>
                  <form
                    onSubmit={generateForm.handleSubmit(handleGenerateProducts)}
                    className="space-y-4"
                  >
                    <FormField
                      control={generateForm.control}
                      name="brandName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter brand name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generateForm.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Generation Prompt</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the types of products you want to generate..."
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
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Generate Products
                    </Button>
                  </form>
                </Form>

                {generatedProducts.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="font-semibold">Generated Product Ideas</h3>
                    <div className="grid gap-4">
                      {generatedProducts.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 border rounded-lg"
                        >
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-24 h-24 object-cover rounded-md"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {product.productName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {product.description}
                            </p>
                            <p className="text-sm font-medium mt-1">
                              ${product.listPrice.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddGeneratedProduct(product, index)
                            }
                            disabled={addingProducts[index]}
                          >
                            {addingProducts[index] ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add New Product Card */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => {
              setProductToEdit(null);
              form.reset({
                brandName: "",
                productName: "",
                description: "",
                listPrice: 0,
                cost: 0,
                packSize: "",
                volumeSize: "",
                newProduct: "yes",
              });
              setEditDialogOpen(true);
            }}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Add New Product</h3>
              <p className="text-muted-foreground">
                Create a new product in your catalog
              </p>
            </CardContent>
          </Card>

          {/* Existing Products */}
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.newProduct === "yes" && (
                <div className="px-4 pt-4">
                  <Badge>New Product</Badge>
                </div>
              )}
              <div className="aspect-[4/3] relative">
                {product.images && product.images[0] ? (
                  <img
                    src={getImageUrl(product.images[0].url)}
                    alt={product.productName}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProduct(product);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProduct(product.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-1">
                  {product.brandName}
                </h3>
                <p className="text-base mb-2">{product.productName}</p>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">
                    List Price: ${product.listPrice.toFixed(2)}
                  </p>
                  {product.packSize && (
                    <Badge variant="secondary">
                      Pack: {product.packSize}
                    </Badge>
                  )}
                  {product.volumeSize && (
                    <Badge variant="secondary">
                      Volume: {product.volumeSize}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit/Create Product Dialog */}
        <EditProductDialog
          product={productToEdit}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setProductToEdit(null);
          }}
          onSave={handleSaveEdit}
          onGenerateImage={handleGenerateImage}
          onImageUpload={handleImageUpload}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this product? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setProductToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  productToDelete &&
                  deleteProductMutation.mutate(productToDelete)
                }
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedImage && (
          <ImageEditor
            open={true}
            imageUrl={selectedImage.url}
            onClose={() => setSelectedImage(null)}
            onSave={handleImageSave}
          />
        )}
      </div>
    </>
  );
}