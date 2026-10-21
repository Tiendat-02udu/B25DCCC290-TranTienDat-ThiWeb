import java.time.Year;


class Person {
    protected String name;
    protected int birthYear;
    protected String address;
    protected String phone;

    public Person(String name, int birthYear, String address, String phone) {
        this.name = name;
        this.birthYear = birthYear;
        this.address = address;
        this.phone = phone;
    }

    public int getAge() {
        int currentYear = Year.now().getValue();
        return currentYear - birthYear;
    }

    public void showInfo() {
        System.out.println("Họ tên: " + name + " | Tuổi: " + getAge() + 
                           " | Địa chỉ: " + address + " | SĐT: " + phone);
    }
}


class Employee extends Person {
    protected String id;
    protected String department;
    protected double baseSalary;
    protected int startYear;

    public Employee(String name, int birthYear, String address, String phone, 
                    String id, String department, double baseSalary, int startYear) {
        super(name, birthYear, address, phone);
        this.id = id;
        this.department = department;
        this.baseSalary = baseSalary;
        this.startYear = startYear;
    }

    public double calculateSalary() {
        int yearsOfWork = Year.now().getValue() - startYear;
        return baseSalary + (200000.0 * yearsOfWork);
    }

    public String getRole() {
        return "Employee";
    }

    @Override
    public void showInfo() {
        super.showInfo();
        System.out.println("Vai trò: " + getRole() + " | ID: " + id + 
                           " | Phòng ban: " + department + 
                           " | Lương: " + String.format("%.0f", calculateSalary()) + " VNĐ");
    }
}


class Developer extends Employee {
    private String language;
    private double overtimeHours;
    private double overtimeRate;

    public Developer(String name, int birthYear, String address, String phone, 
                     String id, String department, double baseSalary, int startYear, 
                     String language, double overtimeHours, double overtimeRate) {
        super(name, birthYear, address, phone, id, department, baseSalary, startYear);
        this.language = language;
        this.overtimeHours = overtimeHours;
        this.overtimeRate = overtimeRate;
    }

    @Override
    public double calculateSalary() {
        return super.calculateSalary() + (overtimeHours * overtimeRate);
    }

    @Override
    public String getRole() {
        return "Developer";
    }

    @Override
    public void showInfo() {
        super.showInfo();
        System.out.println("Ngôn ngữ: " + language + " | Giờ OT: " + overtimeHours);
    }
}


class Manager extends Employee {
    private int teamSize;
    private double bonusPerMember;

    public Manager(String name, int birthYear, String address, String phone, 
                   String id, String department, double baseSalary, int startYear, 
                   int teamSize, double bonusPerMember) {
        super(name, birthYear, address, phone, id, department, baseSalary, startYear);
        this.teamSize = teamSize;
        this.bonusPerMember = bonusPerMember;
    }

    @Override
    public double calculateSalary() {
        return super.calculateSalary() + (teamSize * bonusPerMember);
    }

    @Override
    public String getRole() {
        return "Manager";
    }

    @Override
    public void showInfo() {
        super.showInfo();
        System.out.println("Số nhân sự quản lý: " + teamSize + " người");
    }
}


public class Main {
    public static void main(String[] args) {
       
        Person[] staff = new Person[3];
        
        staff[0] = new Employee("Trần Tiến Đạt", 2008, "Hà Nội", "0123456789", 
                                "B25DCCC290", "Hành chính", 5000000, 2025);
                                
        staff[1] = new Developer("Nguyễn Văn A", 1998, "Đà Nẵng", "0987654321", 
                                 "DEV01", "IT", 15000000, 2022, 
                                 "Java", 10.5, 300000);
                                 
        staff[2] = new Manager("Lê Thị B", 1990, "TP.HCM", "0112233445", 
                               "MGR01", "Kinh doanh", 20000000, 2018, 
                               5, 500000);

        System.out.println("--- DANH SÁCH NHÂN VIÊN ---");
        
        for (Person p : staff) {
            p.showInfo();
            System.out.println("---------------------------");
        }

        
        double totalSalary = 0;
        int devCount = 0;
        int mgrCount = 0;

        for (Person p : staff) {
            if (p instanceof Employee) {
                totalSalary += ((Employee) p).calculateSalary();
            }
            
            if (p instanceof Developer) {
                devCount++;
            } else if (p instanceof Manager) {
                mgrCount++;
            }
        }

        System.out.println("--- THỐNG KÊ ---");
        System.out.println("Tổng lương của toàn bộ công ty: " + String.format("%.0f", totalSalary) + " VNĐ");
        System.out.println("Số lượng Developer: " + devCount);
        System.out.println("Số lượng Manager: " + mgrCount);
    }
}