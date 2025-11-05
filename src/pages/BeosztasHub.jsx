import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const beosztasPages = [
  {
    title: "Beosztás",
    description: "Napi és heti műszakok kezelése",
    icon: Calendar,
    url: createPageUrl("Schedule"),
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Munkavállalók",
    description: "Dolgozók és szerepkörök kezelése",
    icon: Users,
    url: createPageUrl("Employees"),
    gradient: "from-emerald-500 to-teal-500",
  },
];

export default function BeosztasHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Beosztás</h1>
          <p className="text-muted-foreground">Műszakok és munkavállalók kezelése</p>
        </motion.div>

        <div className="grid gap-4">
          {beosztasPages.map((page, index) => {
            const Icon = page.icon;
            return (
              <motion.div
                key={page.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={page.url}>
                  <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/50">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${page.gradient} shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{page.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {page.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}