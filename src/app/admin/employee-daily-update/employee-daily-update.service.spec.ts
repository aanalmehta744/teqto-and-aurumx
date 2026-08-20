import { TestBed } from '@angular/core/testing';

import { EmployeeDailyUpdateService } from './employee-daily-update.service';

describe('EmployeeDailyUpdateService', () => {
  let service: EmployeeDailyUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeeDailyUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
