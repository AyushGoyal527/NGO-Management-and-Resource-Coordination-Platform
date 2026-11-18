import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => globalThis.__auth, homePath: (r) => `/${r}` }));
vi.mock('../src/services/websiteApi', async (orig) => ({ ...(await orig()),
  publicApi: { site: vi.fn(), programs: vi.fn(), events: vi.fn(), applyVolunteer: vi.fn(), donationInquiry: vi.fn() },
  websiteAdmin: { get: vi.fn(), saveSection: vi.fn(), saveOrganization: vi.fn(), uploadImage: vi.fn() } }));
vi.mock('../src/services/resourceService', async (orig) => ({ ...(await orig()), lookups: { managers: vi.fn(async () => ({ items: [] })), programs: vi.fn(async () => ({ items: [] })), volunteers: vi.fn(async () => ({ items: [] })), people: vi.fn(async () => ({ items: [] })) } }));

import toast from 'react-hot-toast';
import { publicApi, websiteAdmin } from '../src/services/websiteApi';
import PublicLayout from '../src/layouts/PublicLayout';
import Home from '../src/pages/public/Home';
import Programs from '../src/pages/public/Programs';
import Events from '../src/pages/public/Events';
import Volunteer from '../src/pages/public/Volunteer';
import Donate from '../src/pages/public/Donate';
import Contact from '../src/pages/public/Contact';
import WebsiteCms from '../src/pages/admin/WebsiteCms';
import ResourceForm from '../src/components/ResourceForm';
import announcements from '../src/modules/announcements';

const login = (role, permissions = []) => { globalThis.__auth = { user: role ? { _id: 'u1', name: 'Meera', role, permissions } : null, hasPermission: (p) => role === 'admin' || permissions.includes(p), logout: vi.fn() }; };
const org = { name: 'Asha Kiran Foundation', tagline: 'Food and school for every child', email: 'hello@ak.org', phone: '+91 98100 00000', address: 'Sohna Road', socialLinks: { facebook: 'https://facebook.com/ak' } };
const site = (sections = {}, o = org) => ({ organization: o, sections, donateEnabled: true, donateIntro: 'You can give money or food.' });
const site1 = (s) => publicApi.site.mockResolvedValue(s);
const app = (path, el, routePath = '*') => render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<PublicLayout />}><Route path={routePath} element={el} /></Route></Routes></MemoryRouter>);
const FULL = { hero: { title: 'Every child deserves a full plate' }, stats: { items: [{ label: 'Families supported', value: 1280 }, { label: 'Meals served', value: 24500 }] }, mission: { text: 'No child hungry.' } };

beforeEach(() => { vi.clearAllMocks(); login(null); publicApi.programs.mockResolvedValue([]); publicApi.events.mockResolvedValue({ items: [], total: 0, page: 1, pages: 1 }); });
afterEach(cleanup);

describe('public home', () => {
  it('shows the content the CMS provides, including counted numbers', async () => {
    site1(site(FULL)); publicApi.programs.mockResolvedValue([{ name: 'Food Drive', status: 'active', description: 'Hot meals' }]);
    app('/', <Home />);
    expect(await screen.findByRole('heading', { level: 1, name: /full plate/ })).toBeTruthy();
    expect(screen.getByText('1,280')).toBeTruthy(); expect(screen.getByText('24,500')).toBeTruthy();
    expect(screen.getByText('Families supported')).toBeTruthy();
    expect(await screen.findByText('Food Drive')).toBeTruthy(); expect(screen.getByText('Running now')).toBeTruthy();
  });
  it('leaves out sections with no content and falls back to the organisation name', async () => {
    site1(site({}));
    app('/', <Home />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Asha Kiran Foundation' })).toBeTruthy();
    expect(screen.queryByText('Our impact')).toBeNull(); expect(screen.queryByText('Stories from the field')).toBeNull(); expect(screen.queryByText('In their words')).toBeNull();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('What we do')).toBeNull(); expect(screen.queryByText('Coming up')).toBeNull();
  });
  it('still renders when the programs and events requests fail', async () => {
    site1(site(FULL)); publicApi.programs.mockRejectedValue(new Error('x')); publicApi.events.mockRejectedValue(new Error('x'));
    app('/', <Home />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy(); expect(screen.queryByText('What we do')).toBeNull();
  });
  it('shows an error with retry when the site cannot load', async () => {
    publicApi.site.mockRejectedValueOnce(new Error('x')).mockResolvedValue(site(FULL));
    app('/', <Home />);
    await userEvent.click(await screen.findByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /full plate/ })).toBeTruthy();
  });
  it('shows the first hero photo with its description and switches between photos', async () => {
    site1(site({ hero: { title: 'T', images: [{ url: 'https://x.com/a.jpg', alt: 'Children eating' }, { url: 'https://x.com/b.jpg', alt: 'Class' }] } }));
    app('/', <Home />);
    expect(await screen.findByAltText('Children eating')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Show photo 2' }));
    expect(screen.getByAltText('Class')).toBeTruthy();
  });
});

describe('layout', () => {
  it('shows staff login for visitors and a dashboard link for staff', async () => {
    site1(site(FULL)); app('/', <Home />);
    expect((await screen.findAllByRole('link', { name: 'Staff login' })).length).toBeGreaterThan(0);
    cleanup(); login('manager'); site1(site(FULL)); app('/', <Home />);
    expect((await screen.findAllByRole('link', { name: 'Dashboard' }))[0].getAttribute('href')).toBe('/manager');
  });
  it('lists only social links that are set, and has a skip link', async () => {
    site1(site(FULL)); app('/', <Home />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/Facebook/)).toBeTruthy(); expect(screen.queryByText(/Instagram/)).toBeNull();
    expect(screen.getByText('Skip to main content').getAttribute('href')).toBe('#main');
  });
  it('opens and closes the phone menu', async () => {
    site1(site(FULL)); app('/', <Home />);
    const btn = await screen.findByRole('button', { name: /open menu/i });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /close menu/i }).getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('mobile-nav')).toBeTruthy();
  });
  it('sets the page title', async () => {
    site1(site(FULL)); app('/programs', <Programs />);
    await waitFor(() => expect(document.title).toBe('Programs · Asha Kiran Foundation'));
  });
});

describe('programs, events, contact', () => {
  it('programs: friendly empty message', async () => { site1(site()); app('/programs', <Programs />); expect(await screen.findByText('No programs to show yet')).toBeTruthy(); });
  it('events: upcoming first, then past on request, with empty messages', async () => {
    site1(site()); publicApi.events.mockResolvedValueOnce({ items: [{ name: 'Winter Drive', date: '2026-11-06T00:00:00Z', location: 'Hall' }], total: 1, page: 1, pages: 1 });
    app('/events', <Events />);
    expect(await screen.findByText('Winter Drive')).toBeTruthy(); expect(screen.getByText('6')).toBeTruthy();
    expect(publicApi.events).toHaveBeenLastCalledWith(expect.objectContaining({ when: 'upcoming' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Past' }));
    expect(await screen.findByText('No past events to show')).toBeTruthy();
    expect(publicApi.events).toHaveBeenLastCalledWith(expect.objectContaining({ when: 'past', page: 1 }));
  });
  it('contact: shows only the details that exist', async () => {
    site1(site({ contact: { hours: 'Mon to Sat' } }, { name: 'AK', email: 'a@b.org' }));
    app('/contact', <Contact />);
    expect((await screen.findAllByText('a@b.org')).length).toBeGreaterThan(0); expect(screen.getByText('Mon to Sat')).toBeTruthy();
    expect(screen.queryByText('Phone')).toBeNull(); expect(screen.queryByText('Address')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'a@b.org' })[0].getAttribute('href')).toBe('mailto:a@b.org');
  });
});

describe('volunteer application form', () => {
  const fill = async (name = 'Asha Rao', email = 'asha@example.com') => { await userEvent.type(screen.getByLabelText('Full name'), name); await userEvent.type(screen.getByLabelText('Email'), email); };
  it('explains what is missing', async () => {
    site1(site()); app('/volunteer', <Volunteer />);
    await userEvent.click(await screen.findByRole('button', { name: 'Send application' }));
    expect(await screen.findByText('Please enter your name')).toBeTruthy(); expect(screen.getByText('Please enter your email')).toBeTruthy();
    expect(publicApi.applyVolunteer).not.toHaveBeenCalled();
  });
  it('rejects a bad email and phone', async () => {
    site1(site()); app('/volunteer', <Volunteer />);
    await screen.findByLabelText('Full name'); await fill('Asha', 'nope'); await userEvent.type(screen.getByLabelText('Phone (optional)'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }));
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy(); expect(screen.getByText('Enter a valid phone number')).toBeTruthy();
  });
  it('sends chosen and typed skills, an empty honeypot, then thanks the person', async () => {
    site1(site()); publicApi.applyVolunteer.mockResolvedValue({});
    app('/volunteer', <Volunteer />);
    await screen.findByLabelText('Full name'); await fill();
    await userEvent.click(screen.getByLabelText('Teaching')); await userEvent.click(screen.getByLabelText('Driving'));
    await userEvent.type(screen.getByLabelText('Other skills (separate with commas)'), 'Tailoring, Chess');
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }));
    await screen.findByText('Thank you for applying');
    expect(publicApi.applyVolunteer).toHaveBeenCalledWith(expect.objectContaining({ name: 'Asha Rao', email: 'asha@example.com', skills: ['Teaching', 'Driving', 'Tailoring', 'Chess'], website: '' }));
  });
  it('keeps the form and shows the server message when sending fails', async () => {
    site1(site()); publicApi.applyVolunteer.mockRejectedValue({ response: { data: { message: 'Too many forms. Try later' } } });
    app('/volunteer', <Volunteer />);
    await screen.findByLabelText('Full name'); await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Too many forms');
    expect(screen.getByLabelText('Full name').value).toBe('Asha Rao');
  });
  it('hides the honeypot from people and assistive tech', async () => {
    site1(site()); app('/volunteer', <Volunteer />); await screen.findByLabelText('Full name');
    const trap = document.querySelector('input[name="website"]'); expect(trap.getAttribute('tabindex')).toBe('-1'); expect(trap.closest('[aria-hidden="true"]')).toBeTruthy();
  });
});

describe('donation inquiry form', () => {
  const base = async () => { await screen.findByLabelText('Your name'); await userEvent.type(screen.getByLabelText('Your name'), 'Ravi'); };
  it('asks for an amount for money gifts', async () => {
    site1(site()); app('/donate', <Donate />); await base(); await userEvent.type(screen.getByLabelText('Email'), 'r@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('Enter the amount you plan to give')).toBeTruthy(); expect(publicApi.donationInquiry).not.toHaveBeenCalled();
  });
  it('needs an email or a phone number', async () => {
    site1(site()); app('/donate', <Donate />); await base(); await userEvent.click(screen.getByRole('button', { name: /₹500/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('Give an email or a phone number')).toBeTruthy();
  });
  it('rejects zero or negative amounts', async () => {
    site1(site()); app('/donate', <Donate />); await base(); await userEvent.type(screen.getByLabelText('Email'), 'r@x.com'); await userEvent.type(screen.getByLabelText('Amount in rupees'), '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('The amount must be more than 0')).toBeTruthy();
  });
  it('sends the inquiry and shows the reference, payment details and an honest note', async () => {
    site1(site()); publicApi.donationInquiry.mockResolvedValue({ reference: 'A1B2C3D4', payment: { online: false, details: [{ label: 'UPI ID', value: 'ak@bank' }], instructions: 'Keep the reference.' } });
    app('/donate', <Donate />); await base(); await userEvent.type(screen.getByLabelText('Email'), 'r@x.com'); await userEvent.click(screen.getByRole('button', { name: /₹1,000/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('A1B2C3D4')).toBeTruthy(); expect(screen.getByText('ak@bank')).toBeTruthy();
    expect(screen.getByText(/does not take payments/)).toBeTruthy();
    expect(publicApi.donationInquiry).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ravi', donationType: 'money', amount: 1000, anonymous: false }));
  });
  it('for food: no amount field and no amount sent; no payment box', async () => {
    site1(site()); publicApi.donationInquiry.mockResolvedValue({ reference: 'ZZZZ1111', payment: null });
    app('/donate', <Donate />); await base(); await userEvent.click(screen.getByLabelText('Food'));
    expect(screen.queryByLabelText('Amount in rupees')).toBeNull();
    await userEvent.type(screen.getByLabelText('Phone'), '9876543210'); await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('ZZZZ1111')).toBeTruthy(); expect(publicApi.donationInquiry.mock.calls[0][0].amount).toBeUndefined();
    expect(screen.queryByText('How to pay')).toBeNull();
  });
  it('copies a payment detail', async () => {
    const writeText = vi.fn(async () => {}); Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    site1(site()); publicApi.donationInquiry.mockResolvedValue({ reference: 'R', payment: { details: [{ label: 'UPI ID', value: 'ak@bank' }], instructions: '' } });
    app('/donate', <Donate />); await base(); await userEvent.type(screen.getByLabelText('Email'), 'r@x.com'); await userEvent.click(screen.getByRole('button', { name: /₹500/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Copy UPI ID' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Copied'));
  });
});

describe('website CMS', () => {
  const schema = { organization: [{ key: 'name', label: 'Organisation name', type: 'text', max: 100, required: true }],
    order: ['hero', 'stats'], sections: {
      hero: { label: 'Hero', fields: [{ key: 'title', label: 'Headline', type: 'text', max: 120, required: true }, { key: 'description', label: 'Description', type: 'textarea', max: 500 }, { key: 'images', label: 'Hero images (up to 5)', type: 'images', max: 5 }] },
      stats: { label: 'Impact numbers', fields: [{ key: 'items', label: 'Numbers', type: 'list', max: 2, item: [{ key: 'label', label: 'Label', type: 'text', max: 40, required: true }, { key: 'source', label: 'Where the number comes from', type: 'select', required: true, options: [{ value: 'volunteers', label: 'Active volunteers' }, { value: 'manual', label: 'A number I type in' }] }, { key: 'value', label: 'Number', type: 'number', min: 0, max: 100, showWhen: { key: 'source', equals: 'manual' } }] }] } } };
  const data = { organization: { name: 'AK' }, sections: { hero: { title: 'Hello', description: 'Old' }, stats: {} }, schema };
  it('builds its tabs and fields from the server definition', async () => {
    login('admin'); websiteAdmin.get.mockResolvedValue(data); render(<MemoryRouter><WebsiteCms /></MemoryRouter>);
    expect(await screen.findByRole('tab', { name: 'Impact numbers' })).toBeTruthy(); expect(screen.getByRole('tab', { name: 'Organisation' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: 'Hero' })); expect(screen.getByLabelText(/Headline/).value).toBe('Hello');
  });
  it('saves only what is filled in', async () => {
    login('admin'); websiteAdmin.get.mockResolvedValue(data); websiteAdmin.saveSection.mockResolvedValue({ title: 'New' });
    render(<MemoryRouter><WebsiteCms /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Hero' }));
    const t = screen.getByLabelText(/Headline/); await userEvent.clear(t); await userEvent.type(t, '  New  ');
    await userEvent.clear(screen.getByLabelText('Description'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(websiteAdmin.saveSection).toHaveBeenCalledWith('hero', { title: 'New' }));
    expect(toast.success).toHaveBeenCalled();
  });
  it('shows the server message when saving fails', async () => {
    login('admin'); websiteAdmin.get.mockResolvedValue(data); websiteAdmin.saveSection.mockRejectedValue({ response: { data: { message: 'Hero > Headline: is required' } } });
    render(<MemoryRouter><WebsiteCms /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Hero' })); await userEvent.clear(screen.getByLabelText(/Headline/));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('alert')).textContent).toContain('is required');
  });
  it('is read-only without settings.edit', async () => {
    login('manager', ['settings.view']); websiteAdmin.get.mockResolvedValue(data); render(<MemoryRouter><WebsiteCms /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Hero' }));
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull(); expect(screen.getByLabelText(/Headline/).disabled).toBe(true); expect(screen.getByText(/view this page but not change/)).toBeTruthy();
  });
  it('list rows: manual numbers show a number box, counted ones do not, and the limit is enforced', async () => {
    login('admin'); websiteAdmin.get.mockResolvedValue(data); websiteAdmin.saveSection.mockResolvedValue({});
    render(<MemoryRouter><WebsiteCms /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Impact numbers' }));
    await userEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    expect(screen.queryByLabelText('Number')).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText(/Where the number comes from/), 'manual');
    await userEvent.type(screen.getByLabelText('Number'), '12'); await userEvent.type(screen.getByLabelText(/^Label/), 'Meals');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    expect(screen.queryByRole('button', { name: /^Add$/ })).toBeNull(); expect(screen.getByText(/reached the limit of 2/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(websiteAdmin.saveSection).toHaveBeenCalledWith('stats', { items: [{ label: 'Meals', source: 'manual', value: 12 }] }));
  });
  it('uploads an image and puts its address in the form', async () => {
    login('admin'); websiteAdmin.get.mockResolvedValue(data); websiteAdmin.uploadImage.mockResolvedValue({ url: '/uploads/site/' + 'a'.repeat(32) + '.jpg' }); websiteAdmin.saveSection.mockResolvedValue({});
    render(<MemoryRouter><WebsiteCms /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Hero' })); await userEvent.click(screen.getByRole('button', { name: /Add image/ }));
    await userEvent.upload(document.querySelector('input[type=file]'), new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(websiteAdmin.uploadImage).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(websiteAdmin.saveSection.mock.calls[0][1].images[0].url).toMatch(/^\/uploads\/site\/[a-f0-9]{32}\.jpg$/));
  });
});

describe('announcement form', () => {
  const audience = (isAdmin) => { render(<ResourceForm config={announcements} item={null} isAdmin={isAdmin} onClose={() => {}} onSaved={() => {}} />); };
  it('managers do not get an audience choice', async () => { login('manager', ['announcements.create']); audience(false); await screen.findByLabelText(/Title/); expect(screen.queryByLabelText(/Who should see it/)).toBeNull(); });
  it('admins do', async () => { login('admin'); audience(true); expect(await screen.findByLabelText(/Who should see it/)).toBeTruthy(); });
  it('managers send no audience at all', async () => {
    login('manager', ['announcements.create']); const create = vi.spyOn(announcements.service, 'create').mockResolvedValue({}); audience(false);
    await userEvent.type(await screen.findByLabelText(/Title/), 'Hi'); await userEvent.type(screen.getByLabelText(/Message/), 'Body');
    await userEvent.click(screen.getByRole('button', { name: 'Add announcement' }));
    await waitFor(() => expect(create).toHaveBeenCalled()); expect(create.mock.calls[0][0].audience).toBeUndefined();
  });
});
