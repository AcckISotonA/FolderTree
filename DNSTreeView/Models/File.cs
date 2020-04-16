using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DNSTreeView.Models
{
    public class File
    {
        private int _id;
        public int IdFile { get { return _id; } }
        public string Name { get; set; }
        public long Size { get; set; }

        public File(int id)
        {
            _id = id;
        }
    }
}
