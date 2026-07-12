import Header from '../components/Header';
import LiveActivityTicker from '../components/LiveActivityTicker';
import Hero from '../components/Hero';
import MessageBar from '../components/MessageBar';
import BeforeAfter from '../components/BeforeAfter';
import Features from '../components/Features';
import InteractiveShowcase from '../components/InteractiveShowcase';
import AIAssistants from '../components/AIAssistants';
import ProcessDiagram from '../components/ProcessDiagram';
import Problems from '../components/Problems';
import FirstCTA from '../components/FirstCTA';
import YouTubeRecords from '../components/YouTubeRecords';
import SessionReport from '../components/SessionReport';
import TargetAudience from '../components/TargetAudience';
import Reviews from '../components/Reviews';
import FAQ from '../components/FAQ';
import TelegramContact from '../components/TelegramContact';
import LoginSection from '../components/LoginSection';
import FooterDisclaimer from '../components/FooterDisclaimer';
import MobileBottomNav from '../components/MobileBottomNav';
import FloatingActions from '../components/FloatingActions';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-20 md:pb-0">
      <Header />
      <div className="pt-16">
        <LiveActivityTicker />
      </div>
      
      <main className="flex-1">
        <Hero />
        <MessageBar />
        <BeforeAfter />
        <Features />
        <InteractiveShowcase />
        <AIAssistants />
        <ProcessDiagram />
        <Problems />
        <FirstCTA />
        <YouTubeRecords />
        <SessionReport />
        <TargetAudience />
        <Reviews />
        <FAQ />
        <TelegramContact />
        <LoginSection />
      </main>

      <FooterDisclaimer />
      <MobileBottomNav />
      <FloatingActions />
    </div>
  );
}
