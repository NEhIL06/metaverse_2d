import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, MessageCircle, Zap, ArrowRight, Github, Shield } from 'lucide-react';

const Index = () => {
  const features = [
    {
      icon: Building2,
      title: "Virtual Spaces",
      description: "Create custom office environments with drag-and-drop elements and real-time collaboration."
    },
    {
      icon: Users,
      title: "Real-time Presence",
      description: "See your teammates move around in real-time with smooth animations and live updates."
    },
    {
      icon: MessageCircle,
      title: "Proximity Chat",
      description: "Start conversations when you're close to colleagues, just like in a real office."
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "Get started in minutes with pre-built templates or create your own custom layouts."
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Virtual Office</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button asChild variant="hero">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-hero rounded-3xl shadow-glow mx-auto mb-6 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Virtual Office
                </span>
                <br />
                <span className="text-foreground">Made Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Create immersive 2D virtual workspaces where your team can collaborate, 
                chat, and work together in real-time. No complex setup required.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" variant="hero" className="gap-2">
                <Link to="/signup">
                  Start Building
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/signin">
                  Sign In
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                <span>Real-time Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-accent" />
                <span>Open Source</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-card/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need for remote collaboration
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for modern teams who want the benefits of office interaction while working remotely.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-card">
                    <CardHeader>
                      <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <Card className="max-w-3xl mx-auto bg-gradient-hero border-0 shadow-xl text-primary-foreground">
              <CardContent className="p-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to build your virtual office?
                </h2>
                <p className="text-xl text-primary-foreground/90 mb-8">
                  Join thousands of teams already collaborating in virtual workspaces.
                </p>
                <Button asChild size="lg" variant="secondary" className="gap-2">
                  <Link to="/signup">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with React, TypeScript, and WebSocket for real-time collaboration.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
