import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { MyTeamsComponent } from "./myteam.component";

describe("MyTeamsComponent", () => {
  let component: MyTeamsComponent;
  let fixture: ComponentFixture<MyTeamsComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
    imports: [MyTeamsComponent],
}).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(MyTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
