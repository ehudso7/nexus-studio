'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@nexus/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nexus/ui'
import { Input } from '@nexus/ui'
import { Label } from '@nexus/ui'
import { Textarea } from '@nexus/ui'
import { RadioGroup, RadioGroupItem } from '@nexus/ui'
import { useToast } from '@nexus/ui'
import { ArrowLeft, Loader2, Globe, Lock, Zap, Smartphone, Monitor } from 'lucide-react'
import { projectsApi } from '@/lib/api'

const templates = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with an empty canvas',
    icon: Zap,
  },
  {
    id: 'web-app',
    name: 'Web Application',
    description: 'Responsive web app with navigation and pages',
    icon: Monitor,
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'iOS and Android app with native components',
    icon: Smartphone,
  },
]

export default function NewProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: 'blank',
    visibility: 'private',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Project name is required',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)
    
    try {
      // TODO: Replace with actual API call
      // const project = await projectsApi.create({
      //   name: formData.name,
      //   description: formData.description,
      //   isPublic: formData.visibility === 'public',
      //   template: formData.template,
      // })
      
      // Mock success
      setTimeout(() => {
        toast({
          title: 'Success',
          description: 'Project created successfully!',
        })
        router.push('/dashboard/projects/1') // Mock project ID
      }, 1500)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new project to start building your application
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Basic information about your project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Awesome App"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your project..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose a Template</CardTitle>
            <CardDescription>
              Start with a pre-configured template or begin from scratch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.template}
              onValueChange={(value) => setFormData({ ...formData, template: value })}
              disabled={loading}
            >
              <div className="grid gap-4 md:grid-cols-3">
                {templates.map((template) => (
                  <div key={template.id}>
                    <Label
                      htmlFor={template.id}
                      className="flex cursor-pointer rounded-lg border p-4 hover:bg-muted/50 [&:has(:checked)]:border-primary"
                    >
                      <RadioGroupItem value={template.id} id={template.id} className="sr-only" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <template.icon className="h-5 w-5 text-primary" />
                          <span className="font-semibold">{template.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Project Visibility</CardTitle>
            <CardDescription>
              Control who can access your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.visibility}
              onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              disabled={loading}
            >
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-4 w-4" />
                      <span className="font-medium">Private</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Only you and invited collaborators can access this project
                    </p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Public</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Anyone can view this project (authentication still required for editing)
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}