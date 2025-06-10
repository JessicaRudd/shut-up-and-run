
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image'; // For the new BMC image AND the app logo
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  MessageSquareText,
  LogOut,
  // Footprints, // Replaced by logo
  Coffee, 
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/training-plan', label: 'Training Plan', icon: CalendarCheck },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/feedback', label: 'Feedback', icon: MessageSquareText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary/90">
          <Image 
            src="/images/logo.jpg"
            alt="Shut Up and Run Logo" 
            width={40} 
            height={40}
            data-ai-hint="logo running shoe"
          />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">Shut Up and Run</span>
        </Link>
        <SidebarTrigger className="hidden md:flex data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={item.label}
                className={cn(
                  "justify-start",
                  (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="justify-start" tooltip="Log Out">
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Buy Me A Coffee Image Link - visible when sidebar is expanded */}
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <div className="flex justify-center w-full px-1 py-1">
              <a href="https://www.buymeacoffee.com/h9aq9muuYz" target="_blank" rel="noopener noreferrer">
                <Image 
                  src="/images/orange-button.png" 
                  alt="Buy Me A Coffee" 
                  width={190} 
                  height={47}
                  style={{ height: '60px', width: '217px' }}
                  priority 
                  data-ai-hint="coffee button"
                />
              </a>
            </div>
          </SidebarMenuItem>

          {/* Buy Me A Coffee Icon Link - visible when sidebar is collapsed */}
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
            <SidebarMenuButton
              asChild
              tooltip="Buy me a coffee"
              className="justify-center !w-full"
            >
              <a href="https://coff.ee/h9aq9muuYz" target="_blank" rel="noopener noreferrer" className="flex justify-center w-full">
                <Coffee className="h-5 w-5" />
                <span className="sr-only">Buy me a coffee</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
