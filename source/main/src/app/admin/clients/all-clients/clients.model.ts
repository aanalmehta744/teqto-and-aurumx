export class Clients {
  id: number;
  img: string;
  name: string;
  fullName: string;
  bde_name: string;
  bde_email?: string;
  // OLD: bde_account_id?: string;
  // OLD: bde_account_email?: string;
  // NEW CODE: Replaced BDE account fields with bank details
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  employee_id?: number;
  mobile: string;
  email: string;
  company_name: string;
  currency: string;
  billing_method: string;
  linkedin_id: string;
  website_link: string;
  client_note: string;
  country: string;
  prize_tag: string;
  prize_amount: number;
  client_type: string;
  client_Connect_Type: string;
  tag?: string;
  last_followup_date?: string;
  last_followup_note?: string;
  // NEW CODE: Fields added for "Other" connect type source, and platform login details
  client_connect_source?: string;
  platform_id?: string;
  platform_password?: string;
  date: string;
  platform: string;
  technology: string;
  address: string;

  constructor(client: Clients) {
    {
      this.id = client.id || this.getRandomID();
      this.img = client.img || 'assets/images/user/user1.jpg';
      this.name = client.name || '';
      this.bde_name = client.bde_name || '';
      this.bde_email = client.bde_email || '';
      // OLD: this.bde_account_id = client.bde_account_id || '';
      // OLD: this.bde_account_email = client.bde_account_email || '';
      // NEW CODE: Bank detail fields
      this.bank_name = client.bank_name || '';
      this.bank_account_number = client.bank_account_number || '';
      this.ifsc_code = client.ifsc_code || '';
      this.fullName = client.fullName || '';
      this.mobile = client.mobile || '';
      this.email = client.email || '';
      this.company_name = client.company_name || '';
      this.currency = client.currency || '';
      this.billing_method = client.billing_method || '';
      this.linkedin_id = client.linkedin_id || '';
      this.website_link = client.website_link || '';
      this.client_note = client.client_note || '';
      this.country = client.country || '';
      this.prize_tag = client.prize_tag || '';
      this.prize_amount = client.prize_amount || 0;
      this.client_type = client.client_type || '';
      this.client_Connect_Type = client.client_Connect_Type || '';
      this.last_followup_date = client.last_followup_date || '';
      this.last_followup_note = client.last_followup_note || '';
      this.date = client.date || '';
      this.platform = client.platform || '';
      this.technology = client.technology || '';
      this.address = client.address || '';
      this.tag = client.tag || '';
      // NEW CODE: Initialize new fields in constructor
      this.client_connect_source = client.client_connect_source || '';
      this.platform_id = client.platform_id || '';
      this.platform_password = client.platform_password || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
