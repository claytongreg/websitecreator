"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Globe, Pencil } from "lucide-react";

interface Site {
  id: string;
  name: string;
  subdomain: string;
  published: boolean;
  updatedAt: string;
  pages: { slug: string }[];
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            EchoWebo
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">My Sites</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Sites</h1>
            <p className="text-muted-foreground">
              Create and manage your websites
            </p>
          </div>
          <Link href="/dashboard/new" className={buttonVariants()}>
            <Plus className="w-4 h-4 mr-2" />
            New Site
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            Loading...
          </div>
        ) : sites.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any sites yet.
              </p>
              <Link href="/dashboard/new" className={buttonVariants()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Site
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <Card key={site.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {site.name}
                    {site.published && (
                      <Globe className="w-4 h-4 text-green-600" />
                    )}
                  </CardTitle>
                  <CardDescription>{site.subdomain}.echowebo.com</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {site.pages.length} page
                      {site.pages.length !== 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/editor/${site.id}/index`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Pencil className="w-3 h-3 mr-2" />
                      Edit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
