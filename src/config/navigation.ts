export interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

export const affiliateNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/affiliate/dashboard' },
  { label: 'Statistiques', href: '/affiliate/statistics' },
  {
    label: 'Finances',
    children: [
      { label: 'Paiements', href: '/affiliate/payments' },
      { label: 'Dépenses', href: '/affiliate/expenses' }
    ]
  },
  { label: 'Parrainage', href: '/affiliate/referral' },
  { label: 'Récompenses', href: '/affiliate/rewards' }
];

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  {
    label: 'Gestion',
    children: [
      { label: 'Candidatures', href: '/admin/applications' },
      { label: 'Utilisateurs', href: '/admin/users' },
      { label: 'Shaves', href: '/admin/shave' }
    ]
  },
  {
    label: 'Finances',
    children: [
      { label: 'Compta', href: '/admin/compta' },
      { label: 'Paiements', href: '/admin/payments' },
      { label: 'Dépenses', href: '/admin/expenses' },
      { label: 'Salaires', href: '/admin/salaries' }
    ]
  },
  { label: 'Récompenses', href: '/admin/rewards' }
];

export const managerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/manager/dashboard' },
  { label: 'Paiements', href: '/manager/payments' }
];

export function getNavItems(accountType: string): NavItem[] {
  switch (accountType) {
    case 'admin':
      return adminNavItems;
    case 'affiliate':
      return affiliateNavItems;
    case 'manager':
      return managerNavItems;
    default:
      return [];
  }
}
