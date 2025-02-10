import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Users, 
  Package, 
  ShoppingBasket, 
  ArrowRight, 
  Activity,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Hero } from "@/components/ui/hero";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  type: string;
  message: string;
  timestamp: string;
}

interface DashboardStats {
  totalProducts: number;
  totalShelves: number;
  totalUsers: number;
  recentActivity: Activity[];
}

function StatCard({
  icon: Icon,
  title,
  value,
  action,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  value: number;
  action: string;
  onClick: () => void;
}) {
  return (
    <Card className="bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {value}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardHeader>
      <CardFooter>
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={onClick}
        >
          {action}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-48 w-full rounded-lg bg-muted animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-background">
            <CardHeader className="space-y-1">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
      <Card className="bg-background">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const [_, setLocation] = useLocation();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: 2,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-500">Failed to load dashboard data</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const stats_data = stats || {
    totalProducts: 0,
    totalShelves: 0,
    totalUsers: 0,
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <Hero
          content={{
            title: `Welcome back`,
            titleHighlight: user?.firstName || user?.username?.split('@')[0],
            description: "Here's what's happening with your digital shelf management."
          }}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Package}
            title="Total Products"
            value={stats_data.totalProducts}
            action="Manage Products"
            onClick={() => setLocation("/products")}
          />

          <StatCard
            icon={ShoppingBasket}
            title="Active Shelves"
            value={stats_data.totalShelves}
            action="Manage Shelves"
            onClick={() => setLocation("/shelf-setup")}
          />

          <StatCard
            icon={Users}
            title="Team Members"
            value={stats_data.totalUsers}
            action="Manage Users"
            onClick={() => setLocation("/users")}
          />
        </div>

        {/* Recent Activity */}
        <Card className="mt-6 bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats_data.recentActivity?.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{activity.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats_data.recentActivity || stats_data.recentActivity.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity to display
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6 bg-background">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button onClick={() => setLocation("/products")}>
                Add New Product
              </Button>
              <Button onClick={() => setLocation("/shelf-setup")}>
                Create New Shelf
              </Button>
              <Button onClick={() => setLocation("/simulation")}>
                Run Consumer Simulation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}