import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { spaceAPI, mockMapTemplates } from '@/lib/api';
import type { MapTemplate } from '@/types/space';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Check, Grid3X3, Users, Sofa, Coffee } from 'lucide-react';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated: (space: { spaceId: string; name: string; dimensions: string }) => void;
}

const dimensionOptions = [
  { value: '100x100', label: 'Small (100x100)', icon: Grid3X3, description: 'Perfect for small teams' },
  { value: '100x200', label: 'Medium (100x200)', icon: Users, description: 'Conference room size' },
  { value: '200x200', label: 'Large (200x200)', icon: Building2, description: 'Open office layout' },
  { value: '150x150', label: 'Casual (150x150)', icon: Sofa, description: 'Relaxed workspace' },
];

export function CreateSpaceModal({ isOpen, onClose, onSpaceCreated }: CreateSpaceModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    dimensions: '',
    mapId: '',
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.dimensions) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await spaceAPI.create({
        name: formData.name,
        dimensions: formData.dimensions,
        mapId: formData.mapId || undefined,
      });

      onSpaceCreated({
        spaceId: response.spaceId,
        name: formData.name,
        dimensions: formData.dimensions,
      });

      // Reset form
      setFormData({ name: '', dimensions: '', mapId: '' });
      setStep(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create space",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', dimensions: '', mapId: '' });
    setStep(1);
    onClose();
  };

  const selectedTemplate = mockMapTemplates.find(t => t.id === formData.mapId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            Create New Space
          </DialogTitle>
          <DialogDescription>
            Set up your virtual office space for team collaboration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <span className="text-sm font-medium">Basic Info</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 2 ? <Check className="w-3 h-3" /> : '2'}
              </div>
              <span className="text-sm font-medium">Layout</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Template</span>
            </div>
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Space Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Marketing Team Hub, Daily Standup Room"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!formData.name}
                  className="gap-2"
                >
                  Next: Choose Layout
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Dimensions */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Choose Space Size</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {dimensionOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Card
                        key={option.value}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          formData.dimensions === option.value
                            ? 'ring-2 ring-primary bg-primary/5'
                            : ''
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, dimensions: option.value }))}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                              <Icon className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <CardTitle className="text-lg">{option.label}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!formData.dimensions}
                  className="gap-2"
                >
                  Next: Choose Template
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Template Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Choose a Template (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Start with a pre-designed layout or create an empty space
                </p>

                {/* Empty Space Option */}
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md mb-4 ${
                    formData.mapId === ''
                      ? 'ring-2 ring-primary bg-primary/5'
                      : ''
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, mapId: '' }))}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                        <Grid3X3 className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <CardTitle className="text-lg">Empty Space</CardTitle>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Start with a blank canvas and add elements as you go
                    </p>
                  </CardContent>
                </Card>

                {/* Template Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockMapTemplates
                    .filter(template => template.dimensions === formData.dimensions)
                    .map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          formData.mapId === template.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : ''
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, mapId: template.id }))}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted rounded h-24 mb-3 flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.defaultElements.length} pre-placed elements
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  variant="hero"
                  className="gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Creating Space...' : 'Create Space'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}