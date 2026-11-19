import ResourcePage from '../../components/ResourcePage';
import volunteers from '../../modules/volunteers';
import students from '../../modules/students';
import beneficiaries from '../../modules/beneficiaries';

// The same screens serve admins and managers. What each person can see and do comes from their permissions on the server.
export const VolunteersPage = () => <ResourcePage config={volunteers} />;
export const StudentsPage = () => <ResourcePage config={students} />;
export const BeneficiariesPage = () => <ResourcePage config={beneficiaries} />;
