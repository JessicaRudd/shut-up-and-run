'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  MessageSquareText,
  LogOut,
  Footprints,
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
          <Footprints className="h-7 w-7" />
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
