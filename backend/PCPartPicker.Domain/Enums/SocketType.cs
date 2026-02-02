namespace PCPartPicker.Domain.Enums;

public enum SocketType
{
    LGA1700 = 0,  // Intel 12th/13th/14th gen
    LGA1200 = 1,  // Intel 10th/11th gen
    AM5 = 2,      // AMD Ryzen 7000 series
    AM4 = 3,      // AMD Ryzen 1000-5000 series
    Unknown = 4,

    // Newer / additional sockets (append-only to preserve existing DB values)
    LGA1851 = 5,  // Intel Core Ultra (LGA1851)
    STR5 = 6,     // AMD Threadripper sTR5
}
