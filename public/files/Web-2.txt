USE KGL_Test;
GO
CREATE TABLE VendorInfo (
    VendorID INT PRIMARY KEY,
    VendorName VARCHAR(50) NOT NULL
);
GO
CREATE TABLE ShipmentInfo (
    ShipmentID INT PRIMARY KEY,
    Job_Title VARCHAR(10) NOT NULL,
    ChapterID VARCHAR(20) NOT NULL,
    ShipmentDate DATE NOT NULL,
    VendorID INT NOT NULL,
    CONSTRAINT FK_Shipment_Vendor
        FOREIGN KEY (VendorID) REFERENCES VendorInfo(VendorID)
);
GO
INSERT INTO VendorInfo VALUES
(1, 'Oup'),
(2, 'Wiley'),
(3, 'SAGE');
GO
INSERT INTO ShipmentInfo VALUES
(1, 'J003', 'dyr226', '2021-04-08', 3),
(2, 'J003', 'dys001', '2021-04-08', 3),
(3, 'J001', 'dys077', '2021-04-05', 1),
(4, 'J001', 'dys078', '2021-04-03', 1),
(5, 'J002', 'hhs064', '2021-04-03', 1),
(6, 'J005', 'hhs067', '2021-04-01', 2);
GO


Stored Procedures (MANDATORY)
CREATE PROCEDURE usp_GetVendors
AS
BEGIN
    SELECT VendorID, VendorName
    FROM VendorInfo
    ORDER BY VendorName;
END;
GO

CREATE PROCEDURE usp_GetJobTitlesByVendor
    @VendorID INT
AS
BEGIN
    SELECT DISTINCT Job_Title
    FROM ShipmentInfo
    WHERE VendorID = @VendorID
    ORDER BY Job_Title;
END;
GO

CREATE PROCEDURE usp_GetShipmentDetails
    @VendorID INT,
    @JobTitle VARCHAR(10)
AS
BEGIN
    SELECT
        ShipmentID,
        Job_Title,
        ChapterID,
        ShipmentDate
    FROM ShipmentInfo
    WHERE VendorID = @VendorID
      AND Job_Title = @JobTitle;
END;
GO

CREATE PROCEDURE usp_UpdateShipmentDate
    @ShipmentID INT,
    @ShipmentDate DATE
AS
BEGIN
    UPDATE ShipmentInfo
    SET ShipmentDate = @ShipmentDate
    WHERE ShipmentID = @ShipmentID;
END;
GO


5️⃣ Application Flow (High-Level)

DB Tables
   ↓
Stored Procedures
   ↓
DBHelper (ADO.NET)
   ↓
HomeController
   ↓
Index.cshtml
   ↓
jQuery + AJAX + DataTables


6️⃣ ADO.NET Helper (DAL)

DBHelper.cs

using Microsoft.Data.SqlClient;
using System.Data;

namespace Web2.DAL
{
    public class DBHelper
    {
        private readonly string _connectionString;

        public DBHelper(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        public DataTable ExecuteProcedure(string procName, SqlParameter[] param = null)
        {
            DataTable dt = new DataTable();

            using SqlConnection con = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand(procName, con);
            cmd.CommandType = CommandType.StoredProcedure;

            if (param != null)
                cmd.Parameters.AddRange(param);

            SqlDataAdapter da = new SqlDataAdapter(cmd);
            da.Fill(dt);

            return dt;
        }
    }
}


Controllers/HomeController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using Web2.DAL;
using Web2.Models;

public class HomeController : Controller
{
    private readonly DBHelper _db;

    public HomeController(IConfiguration configuration)
    {
        _db = new DBHelper(configuration);
    }

    public IActionResult Index()
    {
        var vendors = new List<VendorModel>();
        DataTable dt = _db.ExecuteProcedure("usp_GetVendors");

        foreach (DataRow r in dt.Rows)
        {
            vendors.Add(new VendorModel
            {
                VendorID = Convert.ToInt32(r["VendorID"]),
                VendorName = r["VendorName"].ToString()
            });
        }
        return View(vendors);
    }

    [HttpGet]
    public JsonResult GetJobTitlesByVendor(int vendorId)
    {
        SqlParameter[] p = { new("@VendorID", vendorId) };
        var dt = _db.ExecuteProcedure("usp_GetJobTitlesByVendor", p);

        return Json(dt.AsEnumerable().Select(r => r["Job_Title"].ToString()).ToList());
    }

    [HttpGet]
    public JsonResult GetShipmentDetails(int vendorId, string jobTitle)
    {
        SqlParameter[] p =
        {
            new("@VendorID", vendorId),
            new("@JobTitle", jobTitle)
        };

        var dt = _db.ExecuteProcedure("usp_GetShipmentDetails", p);
        var list = new List<ShipmentModel>();

        foreach (DataRow r in dt.Rows)
        {
            list.Add(new ShipmentModel
            {
                ShipmentID = (int)r["ShipmentID"],
                Job_Title = r["Job_Title"].ToString(),
                ChapterID = r["ChapterID"].ToString(),
                ShipmentDate = (DateTime)r["ShipmentDate"]
            });
        }
        return Json(list);
    }

    [HttpPost]
    public JsonResult UpdateShipmentDate(int shipmentId, DateTime shipmentDate)
    {
        SqlParameter[] p =
        {
            new("@ShipmentID", shipmentId),
            new("@ShipmentDate", shipmentDate)
        };

        _db.ExecuteProcedure("usp_UpdateShipmentDate", p);
        return Json(new { success = true });
    }
}



Models

VendorModel.cs
namespace Web2.Models
{
    public class VendorModel
    {
        public int VendorID { get; set; }
        public string VendorName { get; set; }
    }
}

ShipmentModel.cs
namespace Web2.Models
{
    public class ShipmentModel
    {
        public int ShipmentID { get; set; }
        public string Job_Title { get; set; }
        public string ChapterID { get; set; }
        public DateTime ShipmentDate { get; set; }
        public int VendorID { get; set; }
    }
}

Index.cshtml
@model List<Web2.Models.VendorModel>

@{
    ViewData["Title"] = "Vendor Shipments";
    Layout = "~/Views/Shared/_Layout.cshtml";
}

<h4 class="mb-3">Vendor List</h4>

<table id="vendorTable" class="table table-bordered display">
    <thead>
        <tr>
            <th>Vendor ID</th>
            <th>Vendor Name</th>
            <th>Job Title</th>
        </tr>
    </thead>
    <tbody>
        @foreach (var v in Model)
        {
            <tr>
                <td>@v.VendorID</td>
                <td>@v.VendorName</td>
                <td>
                    <select class="form-select job-title"
                            data-vendorid="@v.VendorID">
                        <option value="">-- Select --</option>
                    </select>
                </td>
            </tr>
        }
    </tbody>
</table>

<hr />

<h4 class="mt-4">Shipment Details</h4>

<table id="shipmentTable" class="table table-striped">
    <thead>
        <tr>
            <th>Shipment ID</th>
            <th>Job Title</th>
            <th>Chapter</th>
            <th>Shipment Date</th>
            <th>Action</th>
        </tr>
    </thead>
    <tbody></tbody>
</table>

@section Scripts {
<script>
    $(document).ready(function () {

        // Initialize DataTable
        $('#vendorTable').DataTable();

        // Load Job Titles on focus
        $('.job-title').one('focus', function () {
            var ddl = $(this);
            var vendorId = ddl.data('vendorid');

            $.get('/Home/GetJobTitlesByVendor',
                { vendorId: vendorId },
                function (data) {
                    $.each(data, function (i, val) {
                        ddl.append('<option value="' + val + '">' + val + '</option>');
                    });
                });
        });

        // Load Shipment Details
        $('.job-title').change(function () {
            var vendorId = $(this).data('vendorid');
            var jobTitle = $(this).val();
            if (!jobTitle) return;

            $.get('/Home/GetShipmentDetails',
                { vendorId: vendorId, jobTitle: jobTitle },
                function (data) {
                    var rows = '';
                    $.each(data, function (i, s) {
                        rows += `<tr>
                            <td>${s.shipmentID}</td>
                            <td>${s.job_Title}</td>
                            <td>${s.chapterID}</td>
                            <td>
                                <input type="date" class="form-control date"
                                       value="${s.shipmentDate.split('T')[0]}" />
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary update"
                                        data-id="${s.shipmentID}">
                                    Update
                                </button>
                            </td>
                        </tr>`;
                    });
                    $('#shipmentTable tbody').html(rows);
                });
        });

        // Update Shipment Date
        $('#shipmentTable').on('click', '.update', function () {
            var row = $(this).closest('tr');
            var shipmentId = $(this).data('id');
            var date = row.find('.date').val();

            $.post('/Home/UpdateShipmentDate',
                { shipmentId: shipmentId, shipmentDate: date },
                function () {
                    alert('Shipment date updated successfully');
                });
        });

    });
</script>
}

3️⃣ End-to-End Flow (Explain Like a Pro)

Index.cshtml loads vendors
        ↓
Vendor dropdown focused
        ↓
AJAX → GetJobTitlesByVendor
        ↓
User selects Job Title
        ↓
AJAX → GetShipmentDetails
        ↓
User edits date
        ↓
AJAX → UpdateShipmentDate
        ↓
Stored Procedure updates DB
