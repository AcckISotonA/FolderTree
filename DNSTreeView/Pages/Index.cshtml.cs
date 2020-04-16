using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using DNSTreeView.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace DNSTreeView.Pages
{
    [ResponseCache(CacheProfileName = "NoCaching")]

    public class IndexModel : PageModel
    {
        private readonly string _connectionString;
        private readonly ILogger<IndexModel> _logger;

        public class OpenAction
        {
            public int? IdDirectory { get; set; }
            public bool IsSortByName { get; set; }
        }
        public class OpenResult
        {
            public List<Directory> Directories { get; set; }
            public List<File> Files { get; set; }

            public OpenResult()
            {
                Directories = new List<Directory>();
                Files = new List<File>();
            }
        }
        public class AddAction
        {
            public int IdParentDirectory { get; set; }
            public string Name { get; set; }
            public long? Size { get; set; }
        }
        public class MoveAction
        {
            public int? IdDirectory { get; set; }
            public int? IdFile { get; set; }
            public int IdParentDirectory { get; set; }
        }
        public class SharedResult
        {
            public string ErrorText { get; set; }
        }

        public IndexModel(IWebHostEnvironment env, IConfiguration config, ILogger<IndexModel> logger)
        {
            _connectionString = config.GetConnectionString("DefaultConnection").Replace("|DataDirectory|", env.WebRootPath);
            _logger = logger;
        }

        public IActionResult OnGet()
        {
            return Page();
        }

        public JsonResult OnPostLoadDirectory([FromBody]OpenAction openAction)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                connection.Open();

                DataTable dt = new DataTable();

                using (SqlCommand command = new SqlCommand("[dbo].[GetDirectoryItems]", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandTimeout = 300;

                    command.Parameters.Add("@IdDirectory", SqlDbType.Int);
                    command.Parameters["@IdDirectory"].Value = openAction.IdDirectory ?? Convert.DBNull;

                    command.Parameters.Add("@IsSortByName", SqlDbType.Bit);
                    command.Parameters["@IsSortByName"].Value = openAction.IsSortByName;

                    using (SqlDataReader dataReader = command.ExecuteReader())
                    {
                        dt.Load(dataReader);
                    }
                }
                connection.Close();

                OpenResult result = new OpenResult();
                for (int i = 0; i < dt.Rows.Count; i++)
                {
                    if (dt.Rows[i].Field<int?>("Id_Directory").HasValue)
                    {
                        Directory dir = new Directory(dt.Rows[i].Field<int>("Id_Directory"));
                        dir.Name = dt.Rows[i].Field<string>("Name");
                        dir.HasSubItems = dt.Rows[i].Field<bool>("HasSubItems");
                        result.Directories.Add(dir);
                    }
                    else
                    {
                        File file = new File(dt.Rows[i].Field<int>("Id_File"));
                        file.Name = dt.Rows[i].Field<string>("Name");
                        file.Size = dt.Rows[i].Field<long>("Size");
                        result.Files.Add(file);
                    }
                }

                return new JsonResult(JsonConvert.SerializeObject(result));
            }
        }

        public JsonResult OnPostAddItem([FromBody]AddAction addAction)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                connection.Open();
                SharedResult result = new SharedResult();

                string procedureName = !addAction.Size.HasValue ? "[AddDirectory]" : "[AddFile]";

                using (SqlCommand command = new SqlCommand("[dbo]." + procedureName, connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandTimeout = 300;

                    command.Parameters.Add("@Name", SqlDbType.NVarChar);
                    command.Parameters["@Name"].Value = addAction.Name;

                    if (addAction.Size.HasValue)
                    {
                        command.Parameters.Add("@Size", SqlDbType.BigInt);
                        command.Parameters["@Size"].Value = addAction.Size.Value;
                    }

                    command.Parameters.Add("@IdParentDirectory", SqlDbType.Int);
                    command.Parameters["@IdParentDirectory"].Value = addAction.IdParentDirectory;

                    command.Parameters.Add("@ErrorText", SqlDbType.NVarChar);
                    command.Parameters["@ErrorText"].Direction = ParameterDirection.Output;
                    command.Parameters["@ErrorText"].Size = 4000;

                    command.ExecuteNonQuery();

                    result.ErrorText = command.Parameters["@ErrorText"].Value.ToString();
                }
                connection.Close();

                return new JsonResult(JsonConvert.SerializeObject(result));
            }
        }

        public JsonResult OnPostMoveItem([FromBody]MoveAction moveAction)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                connection.Open();
                SharedResult result = new SharedResult();

                string procedureName = moveAction.IdDirectory.HasValue ? "[MoveDirectory]" : "[MoveFile]";

                using (SqlCommand command = new SqlCommand("[dbo]." + procedureName, connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandTimeout = 300;

                    if (moveAction.IdDirectory.HasValue)
                    {
                        command.Parameters.Add("@IdDirectory", SqlDbType.Int);
                        command.Parameters["@IdDirectory"].Value = moveAction.IdDirectory.Value;
                    }
                    else
                    {
                        command.Parameters.Add("@IdFile", SqlDbType.Int);
                        command.Parameters["@IdFile"].Value = moveAction.IdFile.Value;
                    }

                    command.Parameters.Add("@NewIdParentDirectory", SqlDbType.Int);
                    command.Parameters["@NewIdParentDirectory"].Value = moveAction.IdParentDirectory;

                    command.Parameters.Add("@ErrorText", SqlDbType.NVarChar);
                    command.Parameters["@ErrorText"].Direction = ParameterDirection.Output;
                    command.Parameters["@ErrorText"].Size = 4000;

                    command.ExecuteNonQuery();

                    result.ErrorText = command.Parameters["@ErrorText"].Value.ToString();
                }
                connection.Close();

                return new JsonResult(JsonConvert.SerializeObject(result));
            }
        }
    }
}
