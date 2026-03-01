import { useState, useEffect } from 'react';
import { 
  Palette, 
  Bot, 
  Sparkles, 
  Code2, 
  Brush, 
  Cpu, 
  Send,
  Check,
  ChevronRight,
  Star,
  Zap,
  Layers,
  MessageSquare,
  Image,
  Video,
  PenTool,
  Globe,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Fire Loading Indicator Component
const FireIndicator = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 glass-strong px-4 py-2 rounded-full">
      <div className="relative">
        <div className="w-6 h-6 rounded-full bg-gradient-to-t from-orange-500 via-red-500 to-yellow-400 fire-indicator" />
        <div className="absolute inset-0 w-6 h-6 rounded-full bg-gradient-to-t from-orange-500 via-red-500 to-yellow-400 blur-md fire-indicator" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-white/60">Загрузка</span>
        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
      scrolled ? 'glass-strong py-3' : 'py-6 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">WaveSign</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Услуги', id: 'services' },
            { label: 'Портфолио', id: 'portfolio' },
            { label: 'Калькулятор', id: 'calculator' },
            { label: 'Опросник', id: 'quiz' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-sm text-white/70 hover:text-white transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
            </button>
          ))}
        </div>

        <Button 
          onClick={() => scrollTo('quiz')}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 rounded-full px-6"
        >
          Начать проект
        </Button>
      </div>
    </nav>
  );
};

// Hero Section
const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 animated-gradient" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 animate-float">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-white/70">Открыты для новых проектов</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
          <span className="text-white">Создаем</span>
          <br />
          <span className="gradient-text glow-text">цифровое будущее</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
          Студия полного цикла. От графического дизайна до AI-решений — 
          превращаем ваши идеи в впечатляющую реальность.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 rounded-full px-8 py-6 text-lg group"
          >
            Обсудить проект
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })}
            className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg"
          >
            Смотреть работы
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto">
          {[
            { value: '150+', label: 'Проектов' },
            { value: '50+', label: 'Клиентов' },
            { value: '3', label: 'Года опыта' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Services Section
const Services = () => {
  const services = [
    {
      category: 'Digital Design',
      icon: Palette,
      description: 'Визуальные решения, которые запоминаются',
      items: [
        { icon: Brush, name: 'Брендинг & Айдентика', desc: 'Логотипы, гайдлайны, фирменный стиль' },
        { icon: Image, name: 'Графический дизайн', desc: 'Постеры, баннеры, печатные материалы' },
        { icon: Globe, name: 'Web-дизайн', desc: 'Сайты, лендинги, интерфейсы' },
        { icon: Smartphone, name: 'UI/UX Design', desc: 'Мобильные приложения, прототипы' },
      ],
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      category: 'Tech & AI',
      icon: Code2,
      description: 'Технологии, которые работают на вас',
      items: [
        { icon: Bot, name: 'Telegram боты', desc: 'Автоматизация, интеграции, чат-боты' },
        { icon: Cpu, name: 'AI решения', desc: 'Нейросети, генерация контента' },
        { icon: Zap, name: 'Автоматизация', desc: 'Процессы, интеграции, workflow' },
        { icon: Layers, name: 'API разработка', desc: 'Интеграции, микросервисы' },
      ],
      gradient: 'from-fuchsia-500 to-pink-600'
    },
    {
      category: 'Art',
      icon: Sparkles,
      description: 'Творчество без границ',
      items: [
        { icon: PenTool, name: 'Иллюстрации', desc: 'Digital art, концепт-арты' },
        { icon: Video, name: 'Моушн-дизайн', desc: 'Анимация, видеоэффекты' },
        { icon: Image, name: '3D Графика', desc: 'Моделирование, рендеринг' },
        { icon: Star, name: 'NFT Арт', desc: 'Коллекции, маркетплейсы' },
      ],
      gradient: 'from-purple-500 to-indigo-600'
    }
  ];

  return (
    <section id="services" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">Наши услуги</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Три направления — <span className="gradient-text">бесконечные возможности</span></h2>
          <p className="text-white/60 max-w-2xl mx-auto">Каждый проект уникален. Мы подбираем оптимальное сочетание навыков для достижения ваших целей.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {services.map((service, idx) => (
            <Card key={idx} className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-500">
              <CardContent className="p-8">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">{service.category}</h3>
                <p className="text-white/60 mb-8">{service.description}</p>
                
                <div className="space-y-4">
                  {service.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group/item">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-violet-500/20 transition-colors">
                        <item.icon className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-1">{item.name}</h4>
                        <p className="text-white/50 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

// Portfolio Section
const Portfolio = () => {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const projects = [
    {
      title: 'Neon Brand',
      category: 'Digital Design',
      description: 'Полный ребрендинг технологического стартапа с фокусом на современную визуальную айдентику.',
      tags: ['Брендинг', 'Web-дизайн', 'UI/UX'],
      color: 'from-violet-600 to-purple-700'
    },
    {
      title: 'CryptoBot Pro',
      category: 'Tech & AI',
      description: 'Telegram бот для криптовалютных уведомлений с AI-аналитикой рынка.',
      tags: ['Python', 'AI', 'Telegram API'],
      color: 'from-fuchsia-600 to-pink-700'
    },
    {
      title: 'Dreamscape NFT',
      category: 'Art',
      description: 'Коллекция из 10,000 уникальных NFT с генеративным искусством.',
      tags: ['3D', 'Generative Art', 'NFT'],
      color: 'from-purple-600 to-indigo-700'
    },
    {
      title: 'Flow Dashboard',
      category: 'Digital Design',
      description: 'Интерфейс аналитической панели для SaaS-платформы.',
      tags: ['UI/UX', 'Dashboard', 'Design System'],
      color: 'from-violet-500 to-fuchsia-600'
    },
    {
      title: 'AI Assistant',
      category: 'Tech & AI',
      description: 'Интеллектуальный ассистент для автоматизации бизнес-процессов.',
      tags: ['OpenAI', 'NLP', 'Automation'],
      color: 'from-pink-600 to-rose-700'
    },
    {
      title: 'Cyberpunk Series',
      category: 'Art',
      description: 'Серия digital-иллюстраций в киберпанк-стиле.',
      tags: ['Digital Art', 'Concept Art', 'Illustration'],
      color: 'from-indigo-600 to-blue-700'
    }
  ];

  return (
    <section id="portfolio" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-950/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="text-fuchsia-400 text-sm font-medium tracking-wider uppercase mb-4 block">Портфолио</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Наши <span className="gradient-text">лучшие работы</span></h2>
          <p className="text-white/60 max-w-2xl mx-auto">Каждый проект — это история успеха наших клиентов.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, idx) => (
            <Card 
              key={idx} 
              className="glass overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-500"
              onClick={() => setSelectedProject(idx)}
            >
              <div className={`h-48 bg-gradient-to-br ${project.color} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-white/80" />
                  </div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full text-xs text-white/80">
                    {project.category}
                  </span>
                </div>
              </div>
              
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">
                  {project.title}
                </h3>
                <p className="text-white/60 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-violet-500/10 rounded text-xs text-violet-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={selectedProject !== null} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="glass-strong border-white/10 max-w-2xl">
            {selectedProject !== null && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {projects[selectedProject].title}
                  </DialogTitle>
                </DialogHeader>
                <div className={`h-64 rounded-xl bg-gradient-to-br ${projects[selectedProject].color} mb-6 flex items-center justify-center`}>
                  <Sparkles className="w-20 h-20 text-white/50" />
                </div>
                <p className="text-white/70 mb-4">{projects[selectedProject].description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {projects[selectedProject].tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-violet-500/20 rounded-full text-sm text-violet-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <Button 
                  onClick={() => {
                    setSelectedProject(null);
                    document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full"
                >
                  Заказать похожий проект
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

// Calculator Section
const PriceCalculator = () => {
  const [projectType, setProjectType] = useState('design');
  const [complexity, setComplexity] = useState(50);
  const [pages, setPages] = useState(5);
  const [urgent, setUrgent] = useState(false);
  const [aiNeeded, setAiNeeded] = useState(false);
  const [support, setSupport] = useState(false);

  const calculatePrice = () => {
    let basePrice = 0;
    
    switch(projectType) {
      case 'design':
        basePrice = 30000;
        break;
      case 'bot':
        basePrice = 50000;
        break;
      case 'art':
        basePrice = 20000;
        break;
      case 'complex':
        basePrice = 100000;
        break;
    }

    const complexityMultiplier = 0.5 + (complexity / 100);
    const pagesMultiplier = 1 + ((pages - 1) * 0.15);
    const urgentMultiplier = urgent ? 1.3 : 1;
    const aiMultiplier = aiNeeded ? 1.4 : 1;
    const supportCost = support ? 15000 : 0;

    return Math.round(basePrice * complexityMultiplier * pagesMultiplier * urgentMultiplier * aiMultiplier + supportCost);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
    <section id="calculator" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
      
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-violet-400 text-sm font-medium tracking-wider uppercase mb-4 block">Калькулятор</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Рассчитайте <span className="gradient-text">стоимость проекта</span></h2>
          <p className="text-white/60 max-w-2xl mx-auto">Получите предварительную оценку за несколько кликов.</p>
        </div>

        <Card className="glass-strong overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                {/* Project Type */}
                <div>
                  <label className="text-white font-medium mb-4 block">Тип проекта</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'design', label: 'Дизайн', icon: Palette },
                      { value: 'bot', label: 'Бот/AI', icon: Bot },
                      { value: 'art', label: 'Арт', icon: Sparkles },
                      { value: 'complex', label: 'Комплекс', icon: Layers },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setProjectType(type.value)}
                        className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                          projectType === type.value 
                            ? 'border-violet-500 bg-violet-500/20' 
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <type.icon className={`w-6 h-6 ${projectType === type.value ? 'text-violet-400' : 'text-white/50'}`} />
                        <span className={`text-sm ${projectType === type.value ? 'text-white' : 'text-white/60'}`}>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Complexity */}
                <div>
                  <label className="text-white font-medium mb-4 block flex justify-between">
                    <span>Сложность</span>
                    <span className="text-violet-400">{complexity}%</span>
                  </label>
                  <Slider 
                    value={[complexity]} 
                    onValueChange={(v) => setComplexity(v[0])}
                    max={100} 
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-2">
                    <span>Простой</span>
                    <span>Средний</span>
                    <span>Сложный</span>
                  </div>
                </div>

                {/* Pages/Elements */}
                <div>
                  <label className="text-white font-medium mb-4 block flex justify-between">
                    <span>Количество страниц/элементов</span>
                    <span className="text-violet-400">{pages}</span>
                  </label>
                  <Slider 
                    value={[pages]} 
                    onValueChange={(v) => setPages(v[0])}
                    min={1}
                    max={20} 
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {/* Options */}
                <div>
                  <label className="text-white font-medium mb-4 block">Дополнительные опции</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <span className="text-white/80">Срочный заказ</span>
                      </div>
                      <Switch checked={urgent} onCheckedChange={setUrgent} />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                      <div className="flex items-center gap-3">
                        <Cpu className="w-5 h-5 text-violet-400" />
                        <span className="text-white/80">Интеграция AI</span>
                      </div>
                      <Switch checked={aiNeeded} onCheckedChange={setAiNeeded} />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-green-400" />
                        <span className="text-white/80">Поддержка 3 мес</span>
                      </div>
                      <Switch checked={support} onCheckedChange={setSupport} />
                    </div>
                  </div>
                </div>

                {/* Price Display */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30">
                  <div className="text-white/60 text-sm mb-2">Примерная стоимость</div>
                  <div className="text-4xl font-bold gradient-text mb-2">
                    от {formatPrice(calculatePrice())} ₽
                  </div>
                  <p className="text-white/40 text-xs">*Финальная цена зависит от деталей проекта</p>
                </div>

                <Button 
                  onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full py-6"
                >
                  Получить точную оценку
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

// Quiz Section
const Quiz = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [contactInfo, setContactInfo] = useState({ name: '', telegram: '' });

  const questions = [
    {
      question: 'Какой тип проекта вам нужен?',
      options: [
        { value: 'design', label: 'Дизайн', icon: Palette },
        { value: 'bot', label: 'Telegram бот', icon: Bot },
        { value: 'art', label: 'Арт/Иллюстрации', icon: Sparkles },
        { value: 'complex', label: 'Комплексное решение', icon: Layers },
      ],
      multiple: false
    },
    {
      question: 'Какие услуги вам нужны?',
      options: [
        { value: 'branding', label: 'Брендинг', icon: Brush },
        { value: 'web', label: 'Web-дизайн', icon: Globe },
        { value: 'uiux', label: 'UI/UX', icon: Smartphone },
        { value: 'ai', label: 'AI-решения', icon: Cpu },
        { value: 'illustration', label: 'Иллюстрации', icon: PenTool },
        { value: 'motion', label: 'Моушн', icon: Video },
      ],
      multiple: true
    },
    {
      question: 'Какой бюджет вы планируете?',
      options: [
        { value: 'small', label: 'До 50 000 ₽', icon: null },
        { value: 'medium', label: '50 000 — 150 000 ₽', icon: null },
        { value: 'large', label: '150 000 — 300 000 ₽', icon: null },
        { value: 'enterprise', label: '300 000+ ₽', icon: null },
      ],
      multiple: false
    },
    {
      question: 'Какие сроки?',
      options: [
        { value: 'urgent', label: 'Срочно (до 2 недель)', icon: Zap },
        { value: 'month', label: 'В течение месяца', icon: Calendar },
        { value: 'flexible', label: 'Гибкие сроки', icon: null },
      ],
      multiple: false
    }
  ];

  const handleSelect = (value: string) => {
    const currentQ = questions[currentStep];
    if (currentQ.multiple) {
      const current = (answers[currentStep] as string[]) || [];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [currentStep]: updated });
    } else {
      setAnswers({ ...answers, [currentStep]: value });
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = () => {
    setShowSuccess(true);
  };

  const isSelected = (value: string) => {
    const ans = answers[currentStep];
    if (Array.isArray(ans)) {
      return ans.includes(value);
    }
    return ans === value;
  };

  const canProceed = () => {
    const ans = answers[currentStep];
    if (Array.isArray(ans)) {
      return ans.length > 0;
    }
    return !!ans;
  };

  if (showSuccess) {
    return (
      <section id="quiz" className="py-32 relative">
        <div className="max-w-2xl mx-auto px-6">
          <Card className="glass-strong p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Заявка отправлена!</h3>
            <p className="text-white/60 mb-8">Мы свяжемся с вами в ближайшее время для обсуждения деталей проекта.</p>
            <Button 
              onClick={() => {
                setShowSuccess(false);
                setCurrentStep(0);
                setAnswers({});
                setContactInfo({ name: '', telegram: '' });
              }}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full px-8"
            >
              Отправить еще одну
            </Button>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="quiz" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-950/10 to-transparent" />
      
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <span className="text-fuchsia-400 text-sm font-medium tracking-wider uppercase mb-4 block">Опросник</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Расскажите о <span className="gradient-text">вашем проекте</span></h2>
          <p className="text-white/60">Ответьте на несколько вопросов, и мы подготовим персональное предложение.</p>
        </div>

        <Card className="glass-strong overflow-hidden">
          <CardContent className="p-8 md:p-12">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-white/50 mb-2">
                <span>Вопрос {currentStep + 1} из {questions.length + 1}</span>
                <span>{Math.round(((currentStep + 1) / (questions.length + 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / (questions.length + 1)) * 100}%` }}
                />
              </div>
            </div>

            {currentStep < questions.length ? (
              <>
                <h3 className="text-2xl font-bold text-white mb-8">{questions[currentStep].question}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {questions[currentStep].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${
                        isSelected(option.value)
                          ? 'border-violet-500 bg-violet-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      {option.icon && <option.icon className={`w-6 h-6 ${isSelected(option.value) ? 'text-violet-400' : 'text-white/50'}`} />}
                      <span className={`text-sm font-medium ${isSelected(option.value) ? 'text-white' : 'text-white/70'}`}>{option.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="border-white/20 text-white hover:bg-white/10 rounded-full"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full disabled:opacity-50"
                  >
                    Далее
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-6">Контактные данные</h3>
                <p className="text-white/60 mb-8">Оставьте свои контакты, и мы свяжемся с вами.</p>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Ваше имя</label>
                    <input
                      type="text"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                      placeholder="Иван"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Telegram</label>
                    <input
                      type="text"
                      value={contactInfo.telegram}
                      onChange={(e) => setContactInfo({ ...contactInfo, telegram: e.target.value })}
                      placeholder="@username"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="border-white/20 text-white hover:bg-white/10 rounded-full"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!contactInfo.name || !contactInfo.telegram}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Отправить заявку
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

// Calendar icon component for quiz
const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// Footer
const Footer = () => {
  return (
    <footer className="py-16 relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">WaveSign</span>
            </div>
            <p className="text-white/50 max-w-md mb-6">
              Студия цифрового дизайна и технологий. Создаем уникальные решения для вашего бизнеса.
            </p>
            <div className="flex gap-4">
              {['Telegram', 'Instagram', 'Behance'].map((social) => (
                <button key={social} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-violet-500/20 transition-colors">
                  <span className="text-xs text-white/60">{social[0]}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Услуги</h4>
            <ul className="space-y-3">
              {['Digital Design', 'Tech & AI', 'Art', 'Консультация'].map((item) => (
                <li key={item}>
                  <a href="#services" className="text-white/50 hover:text-violet-400 transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Контакты</h4>
            <ul className="space-y-3">
              <li className="text-white/50 text-sm">@wavesignstudio</li>
              <li className="text-white/50 text-sm">hello@wavesign.ru</li>
              <li className="text-white/50 text-sm">Москва, Россия</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-sm">© 2024 WaveSign Studio. Все права защищены.</p>
          <p className="text-white/30 text-sm">Создано с любовью к дизайну</p>
        </div>
      </div>
    </footer>
  );
};

// Main App
function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <FireIndicator />
      <Navigation />
      <Hero />
      <Services />
      <Portfolio />
      <PriceCalculator />
      <Quiz />
      <Footer />
    </div>
  );
}

export default App;
