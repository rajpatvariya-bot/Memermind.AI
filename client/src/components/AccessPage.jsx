import { ArrowRight, ShieldCheck, UserRound, UserRoundCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const roleCards = [
  {
    id: 'guest',
    label: 'PUBLIC ACCESS',
    title: 'Guest',
    icon: UserRound,
    description: 'Get a feel for the studio, try a limited AI workflow, and browse public memes without an account.',
    items: ['Explore the creation studio', 'Browse public memes and templates', 'No account or saved private data'],
    action: 'Explore as Guest',
    to: '/explore',
  },
  {
    id: 'user',
    label: 'YOUR CREATIVE SPACE',
    title: 'Registered user',
    icon: UserRoundCheck,
    description: 'A personal workspace for making memes and keeping your saved creations together.',
    items: ['Use AI captions and image understanding', 'Create, edit, and save private drafts', 'Revisit and manage your own creations'],
  },
  {
    id: 'admin',
    label: 'RESTRICTED ACCESS',
    title: 'Administrator',
    icon: ShieldCheck,
    description: 'A protected console for authorized administrators to monitor the application and manage accounts.',
    items: ['View live account and meme totals', 'Browse accounts with server pagination', 'Suspend or reactivate user accounts'],
  },
];

export default function AccessPage({ user }) {
  const adminTo = user?.role === 'admin' ? '/admin' : user ? '/forbidden' : '/login?next=%2Fadmin';
  return (
    <main className="access-page">
      <section className="access-intro">
        <span className="section-kicker">ONE STUDIO · THREE ACCESS LEVELS</span>
        <h1>Your ideas have<br /><span>their own space.</span></h1>
        <p>Explore freely, create an account to keep your work, or sign in to the restricted management console.</p>
      </section>
      <section className="role-grid" aria-label="Choose your MemeMind access level">
        {roleCards.map((card) => {
          const Icon = card.icon;
          const isUser = card.id === 'user';
          const isAdmin = card.id === 'admin';
          const to = isUser ? (user ? '/dashboard' : '/register') : isAdmin ? adminTo : card.to;
          const action = isUser ? (user ? 'Open My Dashboard' : 'Create Account') : isAdmin ? (user?.role === 'admin' ? 'Open Admin Portal' : 'Restricted Access') : card.action;
          return (
            <article className={`role-card role-card-${card.id}${isUser ? ' role-card-featured' : ''}`} key={card.id}>
              <div className="role-card-top"><span className="role-icon"><Icon size={20} strokeWidth={1.8} /></span><span className="role-eyebrow">{card.label}</span></div>
              <h2>{card.title}</h2>
              <p className="role-description">{card.description}</p>
              <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <Link className={isUser ? 'button-primary role-action' : 'button-secondary role-action'} to={to}>
                {action}<ArrowRight size={15} />
              </Link>
            </article>
          );
        })}
      </section>
      <p className="access-footnote">Administrator accounts are created through a private one-time setup. There is no public admin sign-up.</p>
    </main>
  );
}
