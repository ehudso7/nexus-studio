import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Zap, 
  Code2, 
  Users, 
  Rocket, 
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">NexStudio</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Visual Development</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Build Production-Ready Apps
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Without Writing Code
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            NexStudio is the most powerful visual development platform that enables you to build web, 
            mobile, and desktop applications with enterprise-grade features.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Start Building <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Build
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From drag-and-drop design to deployment, we've got you covered
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Code2 className="w-6 h-6" />}
              title="Visual Development"
              description="Drag and drop components to build your UI. No coding required, but you can add custom code when needed."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI Assistant"
              description="Generate components, optimize code, and get intelligent suggestions powered by GPT-4 and Claude."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Real-time Collaboration"
              description="Work together with your team in real-time. See changes instantly and communicate seamlessly."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Workflow Automation"
              description="Build complex workflows visually. Connect to any API and automate your business processes."
            />
            <FeatureCard
              icon={<Rocket className="w-6 h-6" />}
              title="One-Click Deploy"
              description="Deploy to Vercel, Netlify, AWS, or any platform with a single click. Zero configuration needed."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Enterprise Ready"
              description="Built-in authentication, role-based access control, and enterprise-grade security features."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free and scale as you grow
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="Perfect for side projects"
              features={[
                "3 projects",
                "Basic components",
                "Community support",
                "Vercel deployment"
              ]}
              cta="Start Free"
              href="/auth/signup"
            />
            <PricingCard
              name="Pro"
              price="$29"
              description="For professional developers"
              features={[
                "Unlimited projects",
                "All components",
                "AI Assistant",
                "Priority support",
                "All deployment options"
              ]}
              cta="Start Pro Trial"
              href="/auth/signup"
              featured
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For teams and organizations"
              features={[
                "Everything in Pro",
                "Custom plugins",
                "SSO/SAML",
                "SLA support",
                "On-premise option"
              ]}
              cta="Contact Sales"
              href="/contact"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of developers building the future with NexStudio
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold">NexStudio</h3>
              <p className="text-gray-600">© 2024 NexStudio. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">
                Documentation
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">
                Blog
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({ 
  name, 
  price, 
  description, 
  features, 
  cta, 
  href,
  featured = false 
}: { 
  name: string; 
  price: string; 
  description: string; 
  features: string[]; 
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div className={`bg-white p-8 rounded-lg shadow-sm border ${featured ? 'ring-2 ring-purple-600' : ''}`}>
      {featured && (
        <div className="text-center mb-4">
          <span className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-4xl font-bold">{price}</span>
        {price !== "Custom" && <span className="text-gray-600">/month</span>}
      </div>
      <p className="text-gray-600 mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className="block">
        <Button className="w-full" variant={featured ? 'default' : 'outline'}>
          {cta}
        </Button>
      </Link>
    </div>
  );
}